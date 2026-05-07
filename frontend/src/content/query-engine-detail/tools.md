# Tools

45+ tools, each implementing `Tool<Input, Output, Progress>`. `buildTool()` fills in safe defaults.

## Order of Assembly Matters

Built-ins are sorted A→Z, MCP tools are sorted A→Z, then MCP is appended at the end. This keeps built-in order stable—if MCP tools were mixed in, adding a new MCP tool could shuffle the list and break prompt caching.

**The reason:** The system prompt (including the tool list) is sent with every API call. When the prompt stays identical, the API can reuse cached computations. Shuffling the tool order changes the prompt → cache miss → slower + more expensive.

**File:** `src/Tool.ts`, `src/tools.ts`