# Streaming Tool Execution

Reference: [src/services/tools/StreamingToolExecutor.ts](../../src/services/tools/StreamingToolExecutor.ts), [src/query.ts](../../src/query.ts) (lines 558-566, 838-858, 1366-1384)

## Overview

Normally: model streams full response → THEN tools execute. With `StreamingToolExecutor`, tools start executing **as soon as the model emits a `tool_use` block** — while the model is still streaming more text/tool calls. This overlaps model streaming time with tool execution time.

Feature-gated behind `config.gates.streamingToolExecution`.

## How It Works

1. **During streaming** (step 3 in execution flow) — each time a `tool_use` block arrives, it's fed to `addTool()` immediately
2. **Queue processing** — the executor calls `processQueue()`. If concurrency rules allow, the tool starts executing right away
3. **Polling during streaming** — `getCompletedResults()` is called during streaming to yield any results that finished early (non-blocking, generator)
4. **After streaming completes** (step 8) — `getRemainingResults()` drains whatever tools are still running (async generator, blocks until all done)

## Concurrency Control

Not all tools can run in parallel. Each tool has an `isConcurrencySafe` flag determined by parsing its input.

**Rule:** a tool can start if either:
- Nothing is currently executing, OR
- Both it AND all currently executing tools are concurrency-safe

| Scenario | Can start? |
|----------|-----------|
| Nothing executing | Yes |
| Concurrent-safe tools executing + new concurrent-safe tool | Yes |
| Concurrent-safe tools executing + new non-concurrent tool | No, wait |
| Non-concurrent tool executing + anything new | No, wait |

Examples: multiple file reads can run in parallel (concurrent-safe). A Bash command gets exclusive access (non-concurrent).

## Error Cascading

Only **Bash errors cancel siblings** — not other tool types.

Why? Bash commands often have implicit dependency chains (e.g., `mkdir` fails → subsequent commands are pointless). Read/WebFetch/etc are independent — one failure shouldn't nuke the rest.

When a Bash tool errors:
1. Sets `hasErrored = true`
2. Fires `siblingAbortController` → all sibling tools receive abort signal
3. Sibling tools get synthetic error messages: `"Cancelled: parallel tool call Bash(mkdir foo) errored"`

## Tool Status Lifecycle

```
queued → executing → completed → yielded
```

- **queued** — waiting for concurrency rules to allow execution
- **executing** — tool is running
- **completed** — tool finished, results buffered
- **yielded** — results have been emitted to the caller

## Result Ordering

Results are yielded **in the order tools were received**, not the order they complete. If tool B finishes before tool A, B's results wait until A is yielded first.

Exception: **progress messages** are yielded immediately regardless of order (stored in `pendingProgress`, not `results`).

## Abort Handling

Three abort reasons, each producing a synthetic error `tool_result`:
- **`sibling_error`** — a Bash tool errored, cancelling siblings
- **`user_interrupted`** — user pressed ESC or typed a new message
- **`streaming_fallback`** — streaming failed, executor was `discard()`ed (see [tombstone.md](./tombstone.md))

## Integration with Query Loop

```
Step 3 (streaming):
  model emits tool_use block → addTool() → tool starts executing
  poll getCompletedResults() → yield early results + progress

Step 8 (tool execution):
  if streamingToolExecutor exists:
    getRemainingResults() → drain remaining tools
  else:
    runTools() → sequential execution (fallback path)
```

The sequential path (`runTools`) is the non-streaming fallback — used when the feature gate is off.
