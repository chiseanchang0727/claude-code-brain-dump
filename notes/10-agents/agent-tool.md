# AgentTool — Subagent Architecture

Reference: [`src/tools/AgentTool/AgentTool.tsx`](../../src/tools/AgentTool/AgentTool.tsx), [`src/tools/AgentTool/runAgent.ts`](../../src/tools/AgentTool/runAgent.ts), [`src/tools/AgentTool/forkSubagent.ts`](../../src/tools/AgentTool/forkSubagent.ts)

## Overview

`AgentTool` is the single entry point for all subagent spawning. Its `call()` runs a decision tree that determines agent type, sync/async mode, and isolation.

## Input Parameters

| Parameter | Purpose |
|---|---|
| `subagent_type` | Which agent definition to use. Omitting triggers the fork path. |
| `run_in_background` | Explicit async mode — returns task ID immediately |
| `isolation` | `'worktree'` (git worktree copy) or `'remote'` (ant-only CCR) |
| `cwd` | Working directory override for all child operations |
| `model` | Model alias override (`'opus'`, `'sonnet'`, `'haiku'`) |
| `name` | Makes the agent addressable via `SendMessage` while running |
| `mode` | Permission mode override for teammate spawns |

## Sync vs Async Decision

```
shouldRunAsync = run_in_background === true
              || selectedAgent.background === true  (from agent definition)
              || isCoordinator
              || proactiveActive
             && !isBackgroundTasksDisabled
```

**Sync**: `call()` awaits the full result and returns it inline.

**Async**: registered as a `LocalAgentTask`, `call()` returns immediately with a task ID. The result arrives later via task notification (`<task-notification>`).

## Fork Path vs Named Agent

### Fork (no `subagent_type`, `FORK_SUBAGENT` feature) `#prompt-cache`

Inherits the parent's full conversation history. `buildForkedMessages()` constructs the child's starting messages as:

```
[...parent history, assistant(all tool_uses), user(placeholder results + directive)]
```

All fork children use an **identical placeholder** (`"Fork started — processing in background"`) for every `tool_result` block, so multiple siblings share the parent's prompt cache — only the final directive text block differs per child.

Recursive forking is blocked by detecting `<fork-boilerplate>` in the message history (`isInForkChild()`).

### Named Agent (`subagent_type` set)

Uses an `AgentDefinition` loaded from built-ins or `~/.claude/agents/`. The definition specifies:
- System prompt
- Allowed tools
- Model
- Permission mode
- Max turns
- Whether it runs in background by default

`runAgent.ts` builds a fresh `ToolUseContext` via `createSubagentContext` and calls `query()` directly — the same query loop as the main thread, scoped to the child.

## Isolation Modes

| Mode | What happens |
|---|---|
| Default | Same working directory as parent |
| `worktree` | `createAgentWorktree()` creates a git worktree; `buildWorktreeNotice()` injects a message telling the child to translate paths from inherited context |
| `remote` (ant-only) | `teleportToRemote()` launches in CCR, always async |

## Context Inheritance (`createSubagentContext`) `#prompt-cache`

`createSubagentContext` in `src/utils/forkedAgent.ts` wires the child's context:

- Clones the parent's `fileStateCache`
- Copies `contentReplacementState` for tool result budget sharing (cache-sharing forks need identical decisions)
- Threads `renderedSystemPrompt` from parent — avoids re-calling `getSystemPrompt()` at spawn time (GrowthBook cold→warm divergence would bust the prompt cache)
- Sets `agentId` so hooks can distinguish subagent calls from main-thread calls
- `setAppState` is a **no-op** for async agents (can't update UI state)
- `setAppStateForTasks` is the escape hatch for session-scoped infrastructure that needs to outlive a single turn
