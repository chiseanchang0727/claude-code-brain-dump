# Tool Execution

**File:** `src/query.ts:1363–1409`

Runs when `needsFollowUp = true` — the model returned one or more tool calls.

```
┌─────────────────┐
│   tool block    │  ← model returns this
│   Read file.ts  │
└────────┬────────┘
         ↓
    execution path
```

## Two execution paths

### Streaming path — StreamingToolExecutor

If streaming was enabled, tools started executing **while the model was still responding**. This path waits for any that haven't finished.

### Sequential path — runTools

If streaming wasn't used, all tool calls are dispatched now, in order.

## Permission check

Every tool call goes through `canUseTool()` before execution. If denied, returns a synthetic result explaining the denial — the model sees it as a regular result.

## Tool result shape

Each tool returns a `tool_result` matched to its call. `yieldMissingToolResultBlocks` ensures orphaned calls always get a synthetic result.
