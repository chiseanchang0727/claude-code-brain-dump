# Fork Path

When `AgentTool` is called without a `subagent_type` and the `FORK_SUBAGENT` feature is enabled, the fork path is taken. The child inherits the parent's full conversation history.

## buildForkedMessages()

The child's starting messages are constructed as:

```
[...parent history, assistant(all tool_uses), user(placeholder results + directive)]
```

The parent's entire message history is prepended verbatim. The model's latest response is appended as an `assistant` block containing all tool_use entries. Then a `user` block follows with placeholder `tool_result` entries and the per-child directive.

## Prompt Cache Sharing

All fork siblings use an **identical placeholder** (`"Fork started — processing in background"`) for every `tool_result` block. Because the placeholder text is the same across all siblings, they all hit the parent's prompt cache — only the final directive text block differs per child. This is intentional: cache sharing is the reason the placeholder is fixed.

## Recursive Fork Guard

Recursive forking is blocked by detecting `<fork-boilerplate>` in the message history via `isInForkChild()`. A fork child cannot itself fork.
