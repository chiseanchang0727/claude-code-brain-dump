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

`createSubagentContext` in `src/utils/forkedAgent.ts` (line 345) wires the child's context:

- Clones the parent's `fileStateCache`
- Copies `contentReplacementState` for tool result budget sharing (cache-sharing forks need identical decisions)
- Threads `renderedSystemPrompt` from parent — avoids re-calling `getSystemPrompt()` at spawn time (GrowthBook cold→warm divergence would bust the prompt cache)
- Sets `agentId` so hooks can distinguish subagent calls from main-thread calls
- `setAppState` is a **no-op** for async agents (can't update UI state)
- `setAppStateForTasks` is the escape hatch for session-scoped infrastructure that needs to outlive a single turn

**Key observation:** `createSubagentContext` is NOT exclusive to `~/.claude/agents/` named agents. The rule is: **one independent query loop = one context clone**. Any code that spins up its own `query()` call needs it — including background forks, session memory, compact summaries, and side questions. `~/.claude/agents/` is just one of many callers.

## All Agent Types in the System

### 1. Built-in agents (`src/tools/AgentTool/built-in/`)

Ship with Claude Code. The model requests them via `subagent_type`.

| `agentType` | Source file | Purpose |
|---|---|---|
| `general-purpose` | `generalPurposeAgent.ts:26` | Default when `subagent_type` is omitted and fork is disabled |
| `Explore` | `exploreAgent.ts:65` | Read-only codebase search — no file writes allowed |
| `Plan` | `planAgent.ts:74` | Read-only software architect — designs plans, no implementation |
| `verification` | `verificationAgent.ts:135` | Runs builds/tests/linters after edits, returns PASS/FAIL verdict |
| `claude-code-guide` | `claudeCodeGuideAgent.ts:99` | Answers questions about Claude Code (CLI, SDK, API) |
| `statusline-setup` | `statuslineSetup.ts:135` | Configures the status line setting |
| `fork` | `forkSubagent.ts:61` | Inherits parent's full history — used when `subagent_type` is omitted and fork feature is on |

### 2. User-defined agents (`~/.claude/agents/`)

Markdown files with YAML frontmatter. Each becomes an `AgentDefinition` with its own system prompt, tool list, model, and permission mode. Loaded by `loadAgentsDir.ts`.

`agentType` = the `name` field from the file's frontmatter. Users can shadow a built-in by giving their file the same name.

### 3. Background fork agents (via `runForkedAgent`)

Never exposed as `subagent_type` — launched internally by the system, not by the model.

| Agent | Launched from | Purpose |
|---|---|---|
| `promptSuggestion` | `stopHooks.ts:139` → `PromptSuggestion/promptSuggestion.ts:319` | Generates next-prompt suggestions shown in the UI |
| `extractMemories` | `stopHooks.ts:149` → `extractMemories/extractMemories.ts:415` | Auto-extracts durable memories after each turn |
| `autoDream` | `stopHooks.ts:155` → `autoDream/autoDream.ts:224` | Consolidates memories across sessions |
| `sessionMemory` | `SessionMemory/sessionMemory.ts:318,420` | Reads/writes session memory files at session start/end |
| `compact` summary | `compact/compact.ts:1188` | Produces a summary when the context window is compacted |
| `agentSummary` | `AgentSummary/agentSummary.ts:109` | Summarises a completed subagent run |
| `sideQuestion` | `utils/sideQuestion.ts:80` | Answers an SDK `side_question` control message mid-turn |
