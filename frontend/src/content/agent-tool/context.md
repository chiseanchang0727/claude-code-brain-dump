# Context Inheritance

`createSubagentContext()` in `src/utils/forkedAgent.ts` wires the child agent's execution context from the parent. It determines what the child sees and what it can affect.

## What gets inherited

| Field | Behavior |
|---|---|
| `fileStateCache` | Cloned from parent — child sees same cached file state |
| `contentReplacementState` | Copied for tool result budget sharing |
| `renderedSystemPrompt` | Threaded from parent — avoids re-calling `getSystemPrompt()` |
| `agentId` | Set so hooks can distinguish subagent calls from main-thread calls |
| `setAppState` | No-op for async agents — can't update UI state from a background task |
| `setAppStateForTasks` | Escape hatch for session-scoped infrastructure that outlives a single turn |

## Why renderedSystemPrompt is threaded

If the child called `getSystemPrompt()` fresh, a GrowthBook cold→warm divergence between parent and child would produce a different system prompt — busting the prompt cache. Threading the already-rendered string from the parent avoids this entirely.

## Cache-sharing forks

For fork children, `contentReplacementState` must be identical across siblings so that tool result compression decisions are the same — otherwise sibling responses would differ in structure and the shared prompt prefix would fail to cache.
