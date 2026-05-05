# Streaming Executor

**File:** `src/services/tools/StreamingToolExecutor.ts`

When streaming is active, the model sends its response token by token. As soon as a complete `tool_use` block arrives inside that stream, `query.ts` calls `streamingToolExecutor.addTool()` — the tool starts executing **right there, while the model is still generating the rest of its response**.

```
Model streaming:  [thinking...] [tool_use: Read A] [tool_use: Read B] [done]
                                       ↓ addTool()         ↓ addTool()
Tool execution:                  Read A starts       Read B starts
```

After the stream ends, `getCompletedResults()` returns any tools that already finished. `getRemainingResults()` then waits for the rest, yielding progress messages as they arrive via `Promise.race()` — so the UI stays live even if a tool is slow.

## Why it matters

Without streaming execution, the pipeline is: wait for full model response → run all tools → send next request. With it, tools run in parallel with the model's generation — cutting latency for common patterns like reading multiple files at once.

## Concurrency rules

Not all tools can run in parallel. Each tool has an `isConcurrencySafe` flag determined by parsing its input. A tool can start only if:

- Nothing is currently executing, **or**
- Both the new tool and all currently executing tools are concurrency-safe

| Currently executing | New tool | Can start? |
|---------------------|----------|-----------|
| Nothing | Anything | Yes |
| Concurrent-safe tools | Concurrent-safe | Yes |
| Concurrent-safe tools | Non-concurrent | No — wait |
| Non-concurrent tool | Anything | No — wait |

Examples: multiple file reads can run in parallel (concurrent-safe). A Bash command gets exclusive access (non-concurrent).

## Bash error cascading

Only Bash errors cancel sibling tools — other tool types do not.

Why: Bash commands often have implicit dependency chains (`mkdir` fails → subsequent commands are pointless). Read, WebFetch, and similar tools are independent — one failure shouldn't abort the rest.

When a Bash tool errors:
1. Sets `hasErrored = true`
2. Fires `siblingAbortController` — all sibling tools receive an abort signal
3. Siblings get a synthetic error: `"Cancelled: parallel tool call Bash(mkdir foo) errored"`

## Result ordering

Results are yielded **in the order tools were received**, not the order they complete. If tool B finishes before tool A, B's result waits until A has been yielded first.

Exception: **progress messages** are yielded immediately regardless of order.

## Abort reasons

Three abort paths, each producing a synthetic `tool_result` error:

| Reason | Trigger |
|--------|---------|
| `sibling_error` | A Bash tool errored, cancelling its siblings |
| `user_interrupted` | User pressed Escape or sent a new message |
| `streaming_fallback` | Streaming failed mid-stream; executor was discarded and replaced |
