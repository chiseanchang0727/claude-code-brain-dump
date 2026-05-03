# Batch Mode

**File:** `src/services/tools/toolOrchestration.ts` → `runTools()`

Used when streaming tool execution was not active during the API call. After the model's full response is received, all `tool_use` blocks are dispatched at once via `runTools()`.

The same concurrency rules apply — `partitionToolCalls()` still groups calls into batches based on whether each tool is concurrency-safe. The difference is timing: tools start after the model finishes, not while it's still generating.

## When batch mode is used

Streaming execution requires the API call to have been set up for it. Batch mode is the fallback for any call where that wasn't the case — simpler to reason about, slightly higher latency for multi-tool turns.
