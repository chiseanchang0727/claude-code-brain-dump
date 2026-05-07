# When to Fork

*The following is organized from the actual prompt injected into the model's tool description.  
from: `src/tools/AgentTool/prompt.ts`

## Fork vs Named Subagent

| | Named Subagent | Fork |
|---|---|---|
| Call | `subagent_type: "Explore"` | Omit `subagent_type` |
| Context | Starts fresh — zero context | Inherits full parent conversation |
| Cache | Cold start (expensive) | Shares parent's prompt cache (cheap) |
| Prompt style | Full briefing needed | Short directive — it already knows |
| Use case | Specialized task (explore, plan, review) | "I don't need this output in my context" |

## Decision Rule

- **Yes, I need this output** → do it yourself (keep in context)
- **No, I don't need it** → fork (results stay out, you get a notification when done)

## Use Cases

- **Research**: fork open-ended questions. If research can be broken into independent questions, launch parallel forks in one message. A fork beats a fresh subagent — it inherits context and shares your cache.
- **Implementation**: prefer to fork implementation work that requires more than a couple of edits. Do research before jumping to implementation.

## Rules

**Forks are cheap** — they share your prompt cache. Don't set `model` on a fork — a different model can't reuse the parent's cache. Pass a short `name` (one or two words, lowercase) so the user can see the fork in the teams panel.

**Don't peek.** The tool result includes an `output_file` path — do not Read or tail it unless the user explicitly asks for a progress check. Reading the transcript mid-flight pulls the fork's tool noise into your context, which defeats the point of forking.

**Don't race.** After launching, you know nothing about what the fork found. Never fabricate or predict fork results. The notification arrives as a user-role message in a later turn. If the user asks a follow-up before the notification lands, tell them the fork is still running — give status, not a guess.

**Writing a fork prompt.** Since the fork inherits your context, the prompt is a *directive* — what to do, not what the situation is. Be specific about scope: what's in, what's out, what another agent is handling. Don't re-explain background.
