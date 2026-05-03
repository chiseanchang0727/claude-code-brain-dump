# Tools

**File:** `src/Tool.ts`, `src/tools.ts`

45+ tools, each a self-contained unit. `src/tools.ts` is the registry that composes the active set based on feature flags and permissions.

## The `Tool` type

Every tool implements `Tool<Input, Output, Progress>`. Key methods:

| Method | Purpose |
|---|---|
| `call()` | Main execution — does the actual work |
| `checkPermissions()` | Tool-specific permission logic, called after general permission rules |
| `validateInput()` | Rejects invalid inputs before the permission check |
| `isConcurrencySafe()` | Whether this tool can run in parallel with others |
| `isReadOnly()` | Auto-allowed without a prompt for safe read commands |
| `prompt()` | Description given to the model in the system prompt |
| `mapToolResultToToolResultBlockParam()` | Serializes the result to API wire format — each tool controls exactly what the model sees |

## `buildTool` factory

`buildTool()` fills in **fail-closed defaults** for any method not explicitly defined:

- `isConcurrencySafe → false` (assume not safe)
- `isReadOnly → false` (assume writes)
- `checkPermissions → allow` (defer to general permission system)

Security-relevant tools must override these — the defaults are intentionally conservative.

## Tool registry

Three layers of composition:

```
getAllBaseTools()         ← exhaustive list, feature-gated at module load
        ↓
getTools(permissionCtx)  ← filtered by deny rules + REPL mode
        ↓
assembleToolPool(ctx, mcpTools)  ← merges built-ins + MCP tools
```

`assembleToolPool` sorts built-ins and MCP tools independently before merging — a flat sort would interleave MCP tools among built-ins and bust the prompt cache whenever any MCP tool name sorts between two built-ins.

`filterToolsByDenyRules` strips blanket-denied tools from the prompt entirely — they're not just blocked at call time, the model never even sees them.

## Feature gating

Many tools are conditionally included via feature flags or `process.env` checks at module load time. Examples:
- `REPL_ONLY_TOOLS` hidden when REPL mode is active
- Coordinator-mode tools (`TaskStop`, `SendMessage`) only appear in coordinator builds
- `ToolSearchTool` only included when tool search is optimistically enabled
