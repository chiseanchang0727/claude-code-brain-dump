# Tools

Reference: [`src/tools/`](../../src/tools/), [`src/tools.ts`](../../src/tools.ts)

45+ tools, each a self-contained directory. `src/tools.ts` is the registry that composes the active set based on feature flags and permissions.

## Contents

- (to be filled)

## Key tools to study

- `BashTool` — most-used, shows permission + sandboxing model
- `AgentTool` — spawns sub-agents, recursive query loop
- `MCPTool` — dynamic tool from external MCP server
- `EditTool` / `WriteTool` — file mutation with safety checks
