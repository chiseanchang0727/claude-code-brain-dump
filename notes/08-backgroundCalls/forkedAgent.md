# forkedAgent

Reference: [src/utils/forkedAgent.ts](../../src/utils/forkedAgent.ts)

## Overview

A forked agent is a **background clone of the main conversation** that runs its own query loop independently.

It gets:
- The parent's full message history (for cache sharing via [CacheSafeParams](./cacheSafeParams.md))
- The parent's system prompt, tools, and model (identical, so the API cache hits)
- Its own new prompt appended at the end (e.g., "extract memories from the last N messages")
- A restricted `canUseTool` (e.g., read-only + write only to memory dir)
- Its own abort controller and turn limit

It then runs `query()` — the same agentic loop as the main conversation — but in a sandboxed context. It can call tools, read files, write files, and loop for multiple turns. When done, it returns its messages and usage stats.

Think of it like `fork()` in Unix — clone the process, let the child do its own thing, parent keeps going. Except here it's cloning the conversation context, not a process.

The key difference from [sideQuery](./sideQuery.md) (which is just one API call with no tools) is that forkedAgent can **take actions** — read the codebase, write memory files, run multiple reasoning turns.

## forkedAgent vs Agent Tool (subagent)

| | forkedAgent | Agent tool (subagent) |
|--|-------------|----------------------|
| **Triggered by** | Internal systems (stop hooks, compaction, etc.) | The model decides to spawn it |
| **Visible to user** | No (background, fire-and-forget) | Yes (shows in UI, user sees progress) |
| **Context** | Clones parent's full conversation | Either full clone (fork path) or fresh start (normal path) |
| **Cache sharing** | Yes, via CacheSafeParams | Fork path shares cache; normal path doesn't |
| **Transcript** | Optional sidechain or skipped | Always writes to sidechain |
| **Purpose** | Housekeeping (memory, compaction, suggestions) | User-facing work (research, planning, coding) |
| **Code** | `src/utils/forkedAgent.ts` → `runForkedAgent()` | `src/tools/AgentTool/` → `runAgent()` |

They both run `query()` under the hood, but for completely different reasons. ForkedAgent is invisible plumbing. The Agent tool is a user-facing feature.

## Callers

| Caller | File | Purpose |
|--------|------|---------|
| extractMemories | `src/services/extractMemories/extractMemories.ts` | Auto-extract memories from conversation |
| compact | `src/services/compact/compact.ts` | Compaction summary |
| autoDream | `src/services/autoDream/autoDream.ts` | Memory consolidation |
| sessionMemory | `src/services/SessionMemory/sessionMemory.ts` | Session memory management |
| speculation | `src/services/PromptSuggestion/speculation.ts` | Speculative prompt suggestion |
| promptSuggestion | `src/services/PromptSuggestion/promptSuggestion.ts` | Post-turn prompt suggestions |
| agentSummary | `src/services/AgentSummary/agentSummary.ts` | Agent result summaries |
| sideQuestion | `src/utils/sideQuestion.ts` | Side questions |
| toolResultStorage | `src/utils/toolResultStorage.ts` | Tool result processing |
| query | `src/query.ts` | The main loop itself |
