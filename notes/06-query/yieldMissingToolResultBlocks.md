# yieldMissingToolResultBlocks

Reference: [src/query.ts](../../src/query.ts) (lines 123-149)

## Overview

A safety net that ensures every `tool_use` block gets a matching `tool_result` block — even when things go wrong. The Claude API **requires** that every `tool_use` has a corresponding `tool_result`. If a `tool_use` is emitted without a matching `tool_result`, the next API call fails.

## The Problem

During normal flow, the model emits `tool_use` blocks → tools execute → `tool_result` blocks are generated. But several failure paths can interrupt this:

1. **Model fallback** — streaming fails, switches to fallback model. The first attempt's `tool_use` blocks were already emitted but never got results.
2. **Unexpected errors** — a bug in streaming causes a throw after `tool_use` blocks were emitted but before tool execution.
3. **User abort** — user interrupts after the model emitted `tool_use` blocks but before tools ran (only when `StreamingToolExecutor` is NOT active — when it IS active, the executor handles this itself with synthetic errors).

In all cases: orphaned `tool_use` blocks with no `tool_result` → API error on next call.

## The Solution

`yieldMissingToolResultBlocks` is simple — it scans all assistant messages, finds every `tool_use` block, and emits a synthetic error `tool_result` for each one:

```
For each assistant message:
  For each tool_use block in that message:
    yield { type: 'tool_result', is_error: true, content: errorMessage, tool_use_id: block.id }
```

The error message varies by caller:
- `"Model fallback triggered"` — from the fallback path
- `"Interrupted by user"` — from the abort path
- The actual error message — from the catch-all error handler

## Where It's Called

| Call site | When |
|-----------|------|
| Line 900 | `FallbackTriggeredError` caught — model switching to fallback, clearing first attempt's messages |
| Line 984 | Catch-all for unexpected errors from `callModel()` — bug safety net |
| Line 1025 | User abort when `StreamingToolExecutor` is NOT active (when it IS active, the executor handles abort cleanup itself) |

## Relationship to StreamingToolExecutor

These two solve the same problem (orphaned `tool_use` blocks) but in different contexts:

- **`StreamingToolExecutor`** — handles it during normal streaming by generating synthetic error `tool_result`s for aborted/discarded tools (see [streaming-tool-execution.md](./streaming-tool-execution.md))
- **`yieldMissingToolResultBlocks`** — handles it everywhere else (fallback, errors, abort without streaming executor)

They don't overlap — the abort path checks `if (streamingToolExecutor)` and only calls `yieldMissingToolResultBlocks` when the executor is NOT present.
