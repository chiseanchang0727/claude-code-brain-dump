# System Prompt

**File:** `src/QueryEngine.ts:292` → `src/utils/queryContext.ts`

Called once per **user turn** (once per message you send), inside `QueryEngine.submitMessage()` before the query loop begins. The assembled system prompt is passed into the query loop and reused across all its iterations — even if the loop runs many times due to tool calls.

## Sources

| Source | What it adds |
|--------|-------------|
| Tools | Each tool's description and input schema |
| Model config | Model-specific instructions and constraints |
| MCP servers | Prompts from connected MCP servers |
| Custom prompts | User-defined instructions from config |

## Reference

- [Prompt caching — Anthropic docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

## Why it runs every user turn

The set of available tools or MCP servers can change between user turns (e.g. a new MCP server connects mid-session), so the system prompt is recomposed fresh each time rather than cached across turns.
