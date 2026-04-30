# Tools

Reference: [`src/tools/`](../../src/tools/), [`src/tools.ts`](../../src/tools.ts)

45+ tools, each a self-contained directory. `src/tools.ts` is the registry that composes the active set based on feature flags and permissions.

## Contents

- [tool-interface.md](./tool-interface.md) — The `Tool` type, `buildTool` factory, and tool registry (`getAllBaseTools`, `getTools`, `assembleToolPool`)
- [execution-pipeline.md](./execution-pipeline.md) — How tool calls are executed: streaming vs batch mode, concurrency model, sibling abort, interrupt behavior, per-tool flow
- [validate-input-retry.md](./validate-input-retry.md) — How `validateInput` and Zod schema errors feed back to the model as tagged `tool_result`s, enabling self-correction through the normal query loop

## Key tools to study

- `BashTool` — most-used, shows permission + sandboxing model
- `AgentTool` — spawns sub-agents, recursive query loop. See [`10-agents/`](../10-agents/README.md) for full architecture.
- `MCPTool` — dynamic tool from external MCP server
- `EditTool` / `WriteTool` — file mutation with safety checks
