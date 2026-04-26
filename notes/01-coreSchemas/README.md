# Core Schemas

Reference: [src/entrypoints/sdk/coreSchemas.ts](../../src/entrypoints/sdk/coreSchemas.ts)

## 1. Output Encapsulation Schemas

Schemas that encapsulate output-related data, defined using Zod with `lazySchema()` wrappers.

### ModelUsageSchema
Tracks token usage and cost per model:
- `inputTokens`, `outputTokens` — raw token counts
- `cacheReadInputTokens`, `cacheCreationInputTokens` — cache-related token counts
- `webSearchRequests` — number of web searches performed
- `costUSD` — cost in USD
- `contextWindow`, `maxOutputTokens` — model capacity limits

Used in final result schemas (`modelUsage: z.record(z.string(), ModelUsageSchema())`) to map each model ID to its usage stats.

### OutputFormat Schemas
Define the structure for structured output configuration:
- `OutputFormatTypeSchema` — literal `'json_schema'`
- `BaseOutputFormatSchema` — base with `type` field
- `JsonSchemaOutputFormatSchema` — extends with a `schema` field (`Record<string, unknown>`)
- `OutputFormatSchema` — resolves to `JsonSchemaOutputFormatSchema` (currently the only supported format)

## 2. Thinking Configuration Schemas

Rather than a simple true/false toggle, thinking is modeled as a three-variant union (`ThinkingConfigSchema`):

- **`ThinkingAdaptiveSchema`** — `{ type: 'adaptive' }`. Claude decides when and how much to think. Only available on Opus 4.6+. This is the interesting one — the model self-regulates its reasoning depth.
- **`ThinkingEnabledSchema`** — `{ type: 'enabled', budgetTokens?: number }`. Fixed thinking token budget for older models.
- **`ThinkingDisabledSchema`** — `{ type: 'disabled' }`. No extended thinking.

`ThinkingConfigSchema` takes precedence over the deprecated `maxThinkingTokens` field.

## 3. Hook Types

Hooks are lifecycle callbacks that fire when specific events occur during a Claude Code session. In Python terms, they're like registering a function to run when something happens — similar to `atexit.register()` or `signal.signal()`, but covering a much wider set of events across the session. They let users (or the SDK consumer) run custom shell commands in response to events.

Notably, hooks cover failure cases — not just the happy path. There are dedicated schemas for tool execution failures (`PostToolUseFailure`), conversation turn errors (`StopFailure`), and permission denials (`PermissionDenied`), so consumers can react to errors at the tool, session, and permission levels.

All hook inputs share a `BaseHookInput` with `session_id`, `transcript_path`, and `cwd`. Each event extends this base with event-specific fields.

### Hook Events (28 total)

**Tool lifecycle:**
- `PreToolUse` — before a tool executes (can intercept/block)
- `PostToolUse` — after a tool succeeds
- `PostToolUseFailure` — after a tool fails
- `PermissionRequest` — when a tool requests permission
- `PermissionDenied` — when a tool permission is denied

**Session lifecycle:**
- `SessionStart` — session begins (triggers: startup, resume, clear, compact)
- `SessionEnd` — session ends
- `Stop` — conversation turn ends
- `StopFailure` — conversation turn ends with an error
- `Setup` — initialization (triggers: init, maintenance)

**User interaction:**
- `UserPromptSubmit` — user submits a prompt
- `Notification` — a notification is shown
- `Elicitation` / `ElicitationResult` — a paired set for MCP server interactions. `Elicitation` fires when an MCP server requests user input (hooks can auto-accept/decline without showing the dialog). `ElicitationResult` fires after the user responds, allowing hooks to observe or override the response before it's sent back to the server. Together they form a pair: one intercepts the incoming request for input, the other intercepts the outgoing response. This lets you automate MCP server interactions — e.g., auto-approve certain prompts or log all responses without user involvement.

**Subagent lifecycle:**
- `SubagentStart` — a subagent spawns
- `SubagentStop` — a subagent finishes

**Task lifecycle:**
- `TaskCreated` — a task is created
- `TaskCompleted` — a task completes
- `TeammateIdle` — a teammate agent becomes idle

**Context management:**
- `PreCompact` — before history compaction (triggers: manual, auto)
- `PostCompact` — after history compaction

**Configuration & workspace:**
- `ConfigChange` — settings change (sources: settings, mcpServers, permissions, skills)
- `InstructionsLoaded` — a CLAUDE.md or instruction file is loaded
- `CwdChanged` — working directory changes
- `FileChanged` — a file changes
- `WorktreeCreate` — a git worktree is created
- `WorktreeRemove` — a git worktree is removed

## 4. Agent Definition Types

Schemas for defining custom subagents invoked via the Agent tool.

### AgentDefinitionSchema
The full blueprint for a custom subagent:
- `description` — natural language description of when to use this agent
- `prompt` — the agent's system prompt
- `model` — model alias (`'sonnet'`, `'opus'`, `'haiku'`) or full model ID; inherits parent's model if omitted
- `tools` — allowed tool names (inherits all from parent if omitted)
- `disallowedTools` — tool names to explicitly block
- `mcpServers` — MCP servers available to the agent (via `AgentMcpServerSpecSchema`, which accepts either a string or a config record)
- `skills` — skill names to preload into the agent context
- `initialPrompt` — auto-submitted as the first user turn; slash commands are processed
- `maxTurns` — max API round-trips before stopping
- `background` — if true, runs as a non-blocking fire-and-forget task
- `memory` — scope for auto-loading memory files: `'user'` (~/.claude/agent-memory/), `'project'` (.claude/agent-memory/), or `'local'` (.claude/agent-memory-local/)
- `effort` — reasoning effort level (`low`, `medium`, `high`, `max`, or an integer)
- `permissionMode` — controls how tool executions are handled
- `criticalSystemReminder_EXPERIMENTAL` — experimental field for injecting critical reminders into the system prompt

## 5. Remaining Sections (brief)

The rest of the file is primarily SDK message and session plumbing:

- **Settings Types** — setting source scopes (`user`, `project`, `local`) and plugin config
- **Rewind Types** — schema for file rewind/undo operations
- **External Type Placeholders** — `z.unknown()` stand-ins for Anthropic SDK types (e.g., `APIUserMessage`, `APIAssistantMessage`, `RawMessageStreamEvent`); the type generation script replaces these with proper TS type references
- **SDK Message Types** — the bulk of the remaining file. Defines every message type that flows through the SDK: user messages, assistant messages, tool use/result messages, streaming events, error types, status updates, hook lifecycle messages, and the final result schemas. These are the wire format for SDK consumers.
- **Session Listing Types** — schemas for listing and describing saved sessions