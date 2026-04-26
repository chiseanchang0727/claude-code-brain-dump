# Architecture Flow

The execution flow when a query enters Claude Code.

## Flow Order

| Step | Function / Entry | File:Line | Description |
|------|-----------------|-----------|-------------|
| 1 | CLI bootstrap | `src/entrypoints/cli.tsx` | Fast paths (--version, --dump-system-prompt), then loads main |
| 2 | Commander.js setup | `src/main.tsx` | Parses CLI args, sets up session, creates QueryEngine |
| 3 | `QueryEngine.submitMessage()` | `src/QueryEngine.ts:209` | Entry point for each conversation turn |
| 4 | `fetchSystemPromptParts()` | `src/QueryEngine.ts:292` → `src/utils/queryContext.ts` | Composes system prompt from tools, model, MCP, custom prompts |
| 5 | `processUserInput()` | `src/QueryEngine.ts:416` → `src/utils/processUserInput/processUserInput.ts` | Parses prompt, handles /slash commands, determines if API call needed |
| 6 | `recordTranscript()` | `src/QueryEngine.ts:451` → `src/utils/sessionStorage.ts` | Persists user message to JSONL before API call |
| 7 | `query()` / `queryLoop` | `src/query.ts:219` — `while(true)` at `:307` | The API call + tool execution loop (async generator) |
| 8 | API call to Claude | `src/query.ts:337` → `src/services/api/claude.ts` | Sends messages to Claude API, streams response |
| 9 | Tool execution | `src/query.ts:565` → `src/tools/<ToolName>/<ToolName>.ts` | Executes tool calls requested by the model |
| 10 | `canUseTool()` | `src/QueryEngine.ts:243` (wrap) / `src/query.ts:916` (call) | Permission check before each tool execution |
| 11 | `normalizeMessage()` | `src/QueryEngine.ts:769` → `src/utils/queryHelpers.ts` | Normalizes messages for SDK output |
| 12 | `recordTranscript()` | `src/QueryEngine.ts:712,728,780` → `src/utils/sessionStorage.ts` | Persists assistant/tool messages to transcript |
| 13 | Result yielded | `src/QueryEngine.ts` | Final result with cost, usage, duration, errors |

## Notes

- Steps 7-12 repeat in a loop — the model may call tools multiple times per turn
- The loop exits when: the model stops calling tools, max turns reached, budget exceeded, or interrupted
- If `processUserInput()` returns `shouldQuery: false` (e.g., local /slash command), steps 7-12 are skipped entirely
- Some tools (like Agent) spawn their own `query()` loop — creating a recursive structure where step 9 re-enters step 7. The subagent runs its own full loop (API call → tools → repeat) before returning a result to the parent's loop.
