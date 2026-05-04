# Named Agent

When `subagent_type` is set, `AgentTool` loads an `AgentDefinition` — either from built-ins or `~/.claude/agents/`. The child gets a fresh context with no parent history.

## AgentDefinition

| Field | Purpose |
|---|---|
| System prompt | What the agent knows and how it behaves |
| Allowed tools | Which tools this agent can call |
| Model | Model alias for this agent (`opus`, `sonnet`, `haiku`) |
| Permission mode | Scope of what it can do |
| Max turns | Hard turn limit |
| Background | Whether it defaults to async |

## Execution

`runAgent.ts` builds a fresh `ToolUseContext` via `createSubagentContext` and calls `query()` directly — the same query loop as the main thread, scoped to the child. Named agents start with no parent message history; only the system prompt and the initial user message are passed in.

## Agent Definitions

Built-in agents ship with Claude Code. User-defined agents live in `~/.claude/agents/` as YAML or JSON files and can be loaded by any session.
