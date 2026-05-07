# Agent Types

Two dimensions: **source** (where it comes from) and **role** (how it's used).

## By Source

| Type | Source | Definition |
|---|---|---|
| Built-in | `source: 'built-in'` | Hardcoded in `src/tools/AgentTool/built-in/` |
| Custom | `source: 'userSettings' \| 'projectSettings' \| 'policySettings'` | User-defined `.md` files in `.claude/agents/` |
| Plugin | `source: 'plugin'` | From installed plugins |

## Built-in Agents (known)

| Agent | subagent_type | Purpose |
|---|---|---|
| general-purpose | `"general-purpose"` | Default — research, code search, multi-step tasks. All tools. |
| Explore | `"Explore"` | Fast codebase exploration — Glob, Grep, Read only. |
| Plan | `"Plan"` | Software architect — designs implementation plans. No Edit/Write. |
| claude-code-guide | `"claude-code-guide"` | Answers questions about Claude Code itself. |
| statusline-setup | `"statusline-setup"` | Configures status line settings. Only Read + Edit. |
| Verification | (feature-gated) | Verifies implementations. Behind `VERIFICATION_AGENT` flag. |

**Special cases:**
- `worker` — only in coordinator mode (swarm/multi-agent)
- `fork` — implicit fork when `subagent_type` omitted, inherits full parent context

## Custom Agents (unknown)

Users define custom agents as markdown files:

```
~/.claude/agents/my-agent.md          ← user-level
.claude/agents/my-agent.md            ← project-level
<managed>/.claude/agents/my-agent.md  ← enterprise policy
```

Same `BaseAgentDefinition` fields — tools, model, maxTurns, permissionMode, isolation — loaded from frontmatter.

## Resolution Order

When the model calls `Agent({ subagent_type: "foo" })`:

1. Look up `"foo"` in `activeAgents` list
2. If not found and fork experiment is on → implicit fork
3. If not found and fork off → fall back to `general-purpose`

## History Inheritance

**All-or-nothing** — no selective message picking:
- **Known agent type:** task prompt only (clean slate)
- **Unknown agent type:** full parent history inherited

## Fork vs Named Subagent

| | subagent_type: "Explore" | Omit subagent_type (fork) |
|---|---|---|
| Context | Starts fresh — zero context | Inherits full parent conversation |
| Cache | Cold start (expensive) | Shares parent's prompt cache (cheap) |
| Prompt style | Full briefing needed | Short directive — it already knows |
| Use case | Specialized task (explore, plan, review) | "I don't need this output in my context" |

## When to Fork

Fork yourself (omit `subagent_type`) when the intermediate tool output isn't worth keeping in your context. The criterion is qualitative — "will I need this output again?" — not task size.

- **Research**: fork open-ended questions. If research can be broken into independent questions, launch parallel forks in one message. A fork beats a fresh subagent — it inherits context and shares your cache.
- **Implementation**: prefer to fork implementation work that requires more than a couple of edits. Do research before jumping to implementation.

Forks are cheap because they share your prompt cache. Don't set `model` on a fork — a different model can't reuse the parent's cache. Pass a short `name` (one or two words, lowercase) so the user can see the fork in the teams panel.

**Don't peek.** The tool result includes an `output_file` path — do not Read or tail it unless the user explicitly asks for a progress check. Reading the transcript mid-flight pulls the fork's tool noise into your context, which defeats the point of forking.

**Don't race.** After launching, you know nothing about what the fork found. Never fabricate or predict fork results. The notification arrives as a user-role message in a later turn. If the user asks a follow-up before the notification lands, tell them the fork is still running — give status, not a guess.
