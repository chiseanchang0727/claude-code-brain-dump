# Stop Hooks

Reference: [src/query/stopHooks.ts](../../src/query/stopHooks.ts)

Related: [execution-flow.md — step 7b](./execution-flow.md#7b-stop-hooks-line-1267)

## Overview

`handleStopHooks()` fires after the model produces a final response with no tool calls (`!needsFollowUp`, step 7b). It does two categories of work:

1. **Fire-and-forget background tasks** — forked agents that run in the background, user never waits
2. **User-defined stop hooks** — shell commands configured by the user that can block or modify the conversation

## 1. Save Cache Params (line 96)

First thing: save `CacheSafeParams` for the current turn. This lets all the background forks below share the main conversation's prompt cache. Only saved for main thread queries (`repl_main_thread` or `sdk`) — subagents must not overwrite. See [cacheSafeParams.md](../08-backgroundCalls/cacheSafeParams.md).

## 2. Fire-and-Forget Background Tasks (lines 136-157)

All three are skipped in bare/scripted mode (`--bare` / `-p`). All use `void` — fire-and-forget, main loop doesn't wait. All use [forkedAgent](../08-backgroundCalls/forkedAgent.md) under the hood.

### executePromptSuggestion (line 139)
Generates suggested next prompts for the user. A forked agent reads the conversation and produces a suggestion shown in the UI. Only runs for interactive REPL (`repl_main_thread`). Also has a speculation path that pre-computes the response to the suggestion — so if the user accepts, the answer is partially ready.

Guard: `!isEnvDefinedFalsy(process.env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION)`

### executeExtractMemories (line 149)
Auto-extracts durable memories from the conversation and writes them to memory files. See [06-memory/extraction.md](../06-memory/extraction.md) for full details.

Guards: `EXTRACT_MEMORIES` feature flag on, not a subagent, extract mode active.

### executeAutoDream (line 155)
Memory consolidation — periodically reviews accumulated memories across sessions and consolidates them. Runs the `/dream` prompt as a forked agent. Has its own gate order (cheapest checks first):
1. **Time gate** — hours since last consolidation >= configured minimum
2. **Session gate** — enough new sessions have accumulated since last consolidation
3. **Lock** — no other process is mid-consolidation (file-based lock)

Guard: not a subagent (`!toolUseContext.agentId`).

## 3. User-Defined Stop Hooks (lines 175-332) `#resilience`

After the background tasks are launched, `handleStopHooks()` runs user-configured stop hooks (`executeStopHooks`). These are shell commands the user has registered to run when the model stops.

Stop hooks can:
- **Produce output** — stdout/stderr yielded as attachment messages
- **Block with errors** — `blockingError` messages injected into the conversation so the model can fix the issue (transition reason: `stop_hook_blocking`)
- **Prevent continuation** — hook says "stop here, don't let the model continue" (e.g., a linter found issues)

The function returns `{ blockingErrors, preventContinuation }` to the query loop, which decides whether to continue or stop.

## 4. Teammate Hooks (lines 334+)

If the current agent is a teammate (in coordinator mode), additional hooks fire:
- **TaskCompleted hooks** — for any in-progress tasks owned by this teammate
- **TeammateIdle hooks** — signals that this teammate is done and available

## Execution Order

```
handleStopHooks()
  │
  ├─ saveCacheSafeParams()                    ← instant, always
  │
  ├─ void executePromptSuggestion()           ← fire-and-forget
  ├─ void executeExtractMemories()            ← fire-and-forget
  ├─ void executeAutoDream()                  ← fire-and-forget
  │
  ├─ executeStopHooks()                       ← awaited, can block
  │    └─ yields progress, errors, attachments
  │    └─ returns { blockingErrors, preventContinuation }
  │
  └─ teammate hooks (if applicable)           ← awaited
       ├─ executeTaskCompletedHooks()
       └─ executeTeammateIdleHooks()
```

The fire-and-forget tasks run in parallel with the stop hooks. The user-defined stop hooks are awaited because their result affects whether the query loop continues.
