# Streaming Executor

**File:** `src/services/tools/StreamingToolExecutor.ts`

Tools start executing **while the model is still generating** its response. As soon as a complete `tool_use` block arrives in the stream, `addTool()` kicks it off immediately.

## Concurrency

Each tool has an `isConcurrencySafe` flag. A tool can start only if nothing is running, or if all running tools (and the new one) are concurrent-safe.

- Multiple file reads → parallel (concurrent-safe)
- Bash command → exclusive access (non-concurrent)

## Bash error cascading

Only Bash errors cancel sibling tools. When Bash errors, it fires `siblingAbortController` — siblings get: `"Cancelled: parallel tool call Bash(...) errored"`

## Result ordering

Results are yielded **in the order tools were received**, not completion order. Progress messages are yielded immediately.
