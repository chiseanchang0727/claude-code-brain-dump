# Per-Tool Pipeline

**File:** `src/services/tools/toolExecution.ts` → `runToolUse()`

Every tool call goes through this pipeline:

1. **Tool lookup** — find by name, fallback to deprecated aliases
2. **Abort check** — skip if interrupted
3. **Zod validation** — type check against `inputSchema`
4. **`validateInput()`** — semantic checks (e.g. file exists, `old_string` found)
5. **Speculative classifier** — Bash only, starts security check in parallel
6. **`backfillObservableInput()`** — expand paths for hooks/permissions
7. **`PreToolUse` hooks** — can modify input or deny
8. **Permission check** — `canUseTool()` gate
9. **`tool.call()`** — actual execution
10. **Result serialization** — convert to API format
11. **`PostToolUse` hooks** — can modify output

## Self-correction

No retry loop. Validation errors return as `tool_result` — the model reads it, corrects, and retries on the next turn through the normal query loop.
