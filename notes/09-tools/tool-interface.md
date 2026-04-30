# Tool Interface

Reference: [`src/Tool.ts`](../../src/Tool.ts), [`src/tools.ts`](../../src/tools.ts)

## The `Tool` Type

Every tool is an object satisfying `Tool<Input, Output, Progress>`. Key methods:

| Method | Purpose |
|---|---|
| `call()` | Main execution — does the work |
| `checkPermissions()` | Tool-specific permission logic (called after general permission rules) |
| `validateInput()` | Rejects invalid inputs before permission check |
| `isConcurrencySafe()` | Whether this tool can run in parallel with others |
| `isReadOnly()` | `true` → tool can be auto-allowed without a permission prompt (e.g. BashTool auto-allows safe read commands); also gates Bash access in `extractMemories` |
| `isDestructive()` | UI label only — shown as `[destructive]` tag in MCP tool views and exposed in the SDK tool list as `annotations.destructive`. Not used in the core permission gate. |
| `prompt()` | Description given to the model in the system prompt |
| `mapToolResultToToolResultBlockParam()` | Serializes the internal result type to API wire format (`ToolResultBlockParam`). Each tool controls exactly what the model sees — fields can be collapsed, formatted, or omitted. |
| `maxResultSizeChars` | Threshold above which result is persisted to disk and replaced with a file path |
| `shouldDefer` / `alwaysLoad` | Controls ToolSearch deferral — whether this tool's schema is hidden until searched |

## `buildTool` Factory

`buildTool()` takes a partial `ToolDef` and fills in **fail-closed defaults**:

- `isConcurrencySafe → false` (assume not safe)
- `isReadOnly → false` (assume writes)
- `isDestructive → false`
- `checkPermissions → allow` (defer to general permission system)
- `toAutoClassifierInput → ''` (skip auto-mode classifier)
- `userFacingName → name`

Security-relevant tools must override `toAutoClassifierInput` and `checkPermissions` — the defaults are intentionally unsafe to leave in place for tools that affect external systems. `#fail-closed-default`

## Tool Registry (`src/tools.ts`)

Three layers of composition:

```
getAllBaseTools()         ← exhaustive list, feature-gated at module load
        ↓
getTools(permissionCtx)  ← filtered by deny rules + REPL mode
        ↓
assembleToolPool(ctx, mcpTools)  ← merges built-ins + MCP tools, sorted for cache stability
```

**`assembleToolPool`** sorts both partitions independently (built-ins as a contiguous prefix, MCP tools after) before merging. A flat sort would interleave MCP tools among built-ins and bust the prompt cache whenever any MCP tool name sorts between two built-ins.

**`filterToolsByDenyRules`** runs before the model ever sees the tool list — blanket-denied tools are stripped from the prompt entirely, not just blocked at call time.

## Notable Implementation Patterns

### WeakMap side-channel (`FileReadTool`) `#api-boundary` `#staleness-guard`

Memory files are point-in-time observations. If a memory says "function X is on line 47 of foo.ts" and was written 60 days ago, the code has likely moved — but the model treats the file:line citation as authoritative, making the stale claim sound *more* reliable, not less. User reports confirmed this was causing the model to assert outdated facts as current.

The fix: when the model reads a memory file older than 1 day, prepend a `<system-reminder>` warning that citations may be outdated. Fresh memories (today/yesterday) get nothing — the warning there would just be noise. See `src/memdir/memoryAge.ts`.

To do this, the mapper needs the file's mtime. But mtime can't be added to `FileReadOutput` — that schema flows into public SDK types and mtime is presentation-only. So `call()` stashes it in a `WeakMap<object, number>` keyed on the result object, and the mapper picks it up by the same reference:

```typescript
// In call() — stash mtime against the result object
memoryFileMtimes.set(data, stat.mtimeMs)

// In mapper — retrieve by same object reference
const mtimeMs = memoryFileMtimes.get(data)
```

The WeakMap auto-GCs when the data object is no longer referenced — no manual cleanup needed.

### User-modified note (`FileEditTool`) `#context-management` `#resilience`

Claude's correctness depends on its mental model of the codebase matching reality. If Claude believes it wrote one thing but something different is actually on disk, any subsequent edits or reasoning built on top of that assumption will be wrong. This is a context management problem.

When Claude proposes an edit, the user sees a diff in the permission prompt and can modify the proposed change before accepting. What gets written to the file is the user's version — not Claude's original. Without any signal, Claude would continue believing the file contains exactly what it wrote.

Example:
1. Claude proposes changing `return null` → `return []`
2. User sees the diff, edits it to `return undefined` before accepting
3. The file now contains `return undefined` — not what Claude wrote
4. Without the note, Claude's next turn might say "since I changed it to return `[]`, we can now safely call `.map()`" — which would be wrong

To keep Claude's model in sync: `inputsEquivalent()` compares Claude's original input against the `updatedInput` the user submitted. If they differ, `userModified = true` and the mapper injects `"The user modified your proposed changes before accepting them."` into the tool result. Claude now knows the file state diverged from its intention and can read the file back before building further edits on top of it.

## Feature Gating

Many tools are conditionally included via `feature()` flags or `process.env` checks at module load time (dead code elimination via `bun:bundle`). Examples:
- `REPL_ONLY_TOOLS` are hidden when REPL mode is active (the REPL wraps primitives)
- Coordinator-mode tools (`TaskStop`, `SendMessage`) only appear in coordinator builds
- `ToolSearchTool` only included when tool search is optimistically enabled
