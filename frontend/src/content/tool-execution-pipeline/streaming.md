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

Without streaming execution, the pipeline would be: wait for full model response → run all tools → send next request. With it, tools run in parallel with the model's generation — cutting latency for common patterns like reading multiple files at once.
