# Query Loop

Reference: [`src/query.ts`](../../src/query.ts)

`query()` is the core agentic loop that `QueryEngine.submitMessage()` delegates to. It is an async generator — it `yield`s messages and stream events to the caller as they happen, and `return`s a `Terminal` (the exit reason) when done.

## `query()` vs `queryLoop()` — the split (`:219` / `:241`)

```
query()         ← public API, thin wrapper
  └─ queryLoop()  ← actual while(true) loop
```

`query()` does one thing on top of `queryLoop()`: when the loop exits *normally* (no throw, no `.return()`), it fires `notifyCommandLifecycle(uuid, 'completed')` for any queued commands consumed during the turn. Errors and aborts bypass this — the `yield*` propagation skips the post-loop code entirely.

## The `State` struct (`:268`)

Instead of 9 separate `let` variables, the loop carries a single `State` object. At every `continue` site, code writes `state = { ...next }` — one atomic reassignment. This makes it easy to see exactly what changes between iterations.

See [query-state.md](./query-state.md) for all fields and their semantics.

## Per-iteration flow

Each pass through `while(true)` (`:307`) does:

| # | What | Line |
|---|------|------|
| 1 | Destructure `state` into local vars | `:311` |
| 2 | Fire skill discovery prefetch (async, hidden under model stream) | `:331` |
| 3 | `yield { type: 'stream_request_start' }` | `:337` |
| 4 | Build `messagesForQuery` — slice after compact boundary | `:365` |
| 5 | Apply tool result budget (truncate oversized results) | `:379` |
| 6 | Apply snip compact (feature-gated) | `:401` |
| 7 | Apply microcompact | `:414` |
| 8 | Apply context collapse projection (feature-gated) | `:429` |
| 9 | Apply autocompact if threshold exceeded | `~:460` |
| 10 | Call `queryModelWithStreaming()` → streams API response + executes tools in parallel | `~:550` |
| 11 | Handle abort (synthetic tool_results, interruption message) | `:1015` |
| 12 | Handle withhold-then-recover (413 / media errors) | `:1062` |
| 13 | Run stop hooks if no follow-up needed | `~:1267` |
| 14 | Collect tool results, attachments, memory prefetch, skill prefetch | `:1380–1628` |
| 15 | Refresh tools (new MCP servers) | `:1659` |
| 16 | Check `maxTurns` | `:1705` |
| 17 | Build next `State`, `continue` | `:1715` |

## The `needsFollowUp` flag — how the loop decides to continue (`:558`)

`needsFollowUp` starts `false` at the top of every iteration. It only becomes `true` if the model's response contains `tool_use` blocks (`:834`).

```ts
if (msgToolUseBlocks.length > 0) {
  needsFollowUp = true   // model called tools → keep going
}
```

After streaming completes, there are two paths:

```
needsFollowUp = false  →  if (!needsFollowUp) { stop hooks → return }
needsFollowUp = true   →  falls through to next: State = { ... } → continue
```

The `next_turn` state (`:1714`) is **outside** the `if (!needsFollowUp)` block — it is only reachable when `needsFollowUp = true`. The next state carries:

```ts
messages: [...messagesForQuery, ...assistantMessages, ...toolResults]
```

On the next iteration the model sees the **full accumulated context** — original messages + every previous assistant response + every tool result so far — and re-evaluates: call more tools, or stop. The model decides, not the loop.

This is the core of agentic behavior. The user submits once; the loop drives itself across N iterations until the model produces a response with no tool calls:

```
user submits once
  └─► iter 1: model calls tools → needsFollowUp=true → next_turn
  └─► iter 2: model calls tools → needsFollowUp=true → next_turn
  └─► iter 3: model calls no tools → needsFollowUp=false → return to user
```

## Exit conditions (`Terminal.reason`)

| Reason | Where | Trigger |
|--------|-------|---------|
| `end_turn` | stop hooks | Model returned `stop_reason: end_turn` with no tool calls |
| `max_turns` | `:1711` | `turnCount > maxTurns` |
| `aborted_streaming` | `:1051` | `abortController.signal.aborted` during stream |
| `aborted_tools` | `~:1515` | Abort detected after tool execution |
| `model_error` | `:996` | Unexpected throw from streaming |
| `prompt_too_long` | `:1175` | 413 error, all recovery paths exhausted |
| `image_error` | `:977` / `:1175` | `ImageSizeError`, `ImageResizeError`, or withheld media error |
| `budget_exceeded` | token budget | Token budget hit (see [token-budget.md](./token-budget.md)) |

## Relationship to `QueryEngine.ts`

```
QueryEngine.submitMessage()   (QueryEngine.ts:209)
  │  assembles systemPrompt, processUserInput, recordTranscript
  └─► query()                 (query.ts:219)
        └─► queryLoop()       (query.ts:241)
              while(true) { API call → tools → continue }
              return Terminal
  QueryEngine receives Terminal, yields final result message
```

`QueryEngine` owns session state (message history, usage totals, permission denials). `query.ts` owns per-turn execution state (the `State` struct, compact tracking, turn count).

## Contents

- [query-state.md](./query-state.md) — mutable loop state, `State` struct, `continue` pattern
- [compaction-strategies.md](./compaction-strategies.md) — snip / microcompact / context collapse / autocompact: what each does, trigger conditions, order
- [streaming-result-handling.md](./streaming-result-handling.md) — every condition checked on streaming output: per-message (tombstone, withhold, tool_use, poll) and post-stream (fallback, abort, 413 recovery)
- [execution-flow.md](./execution-flow.md) — detailed 12-step execution flow with state machine diagrams
- [async-prefetch.md](./async-prefetch.md) — start async work early, consume when ready
- [withhold-then-recover.md](./withhold-then-recover.md) — hold back recoverable errors, retry, surface if all fails
- [tombstone.md](./tombstone.md) — retract orphaned messages on streaming fallback
- [streaming-tool-execution.md](./streaming-tool-execution.md) — tools start executing while model is still streaming
- [yieldMissingToolResultBlocks.md](./yieldMissingToolResultBlocks.md) — safety net: every tool_use gets a matching tool_result
- [stop-hooks.md](./stop-hooks.md) — what fires after model stops (memory extraction, auto-dream, prompt suggestion)
- [token-budget.md](./token-budget.md) — nudge-to-continue logic with diminishing returns detection
- [tool-orchestration.md](./tool-orchestration.md) — sequential fallback for tool execution with concurrency partitioning
