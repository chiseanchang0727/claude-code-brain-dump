# Tool Execution

**File:** `src/query.ts:1363–1409`

Runs when `needsFollowUp = true` — the model returned one or more `tool_use` blocks.

## Two execution paths

### Streaming path — StreamingToolExecutor

If streaming tool execution was enabled during the API call, tools started executing **while the model was still responding**. This path consumes the already-running tool futures, waiting for any that haven't finished yet.

### Sequential path — runTools

If streaming execution wasn't used, all tool calls are dispatched now, in the order the model requested them.

## Permission check

Every tool call goes through `canUseTool()` before execution:

- Checks against the user's permission settings
- Checks against previously denied tools in this session
- If denied, returns a synthetic tool result explaining the denial

The model sees the denial as a regular tool result and can decide how to proceed.

## Tool result shape

Each executed tool returns a `tool_result` block with the tool's ID matched to the corresponding `tool_use` block. The model needs a result for every `tool_use` — `yieldMissingToolResultBlocks` ensures orphaned tool calls always get a synthetic result.
