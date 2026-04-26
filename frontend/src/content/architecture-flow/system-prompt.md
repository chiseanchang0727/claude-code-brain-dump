# System Prompt

**File:** `src/QueryEngine.ts:292` → `src/utils/queryContext.ts`

Called once per turn before the API call. Assembles the system prompt from multiple sources.

## Sources

| Source | What it adds |
|--------|-------------|
| Tools | Each tool's description and input schema |
| Model config | Model-specific instructions and constraints |
| MCP servers | Prompts from connected MCP servers |
| Custom prompts | User-defined instructions from config |

## Why it runs every turn

The set of available tools or MCP servers can change between turns (e.g. a new MCP server connects mid-session), so the system prompt is recomposed fresh each time rather than cached across turns.
