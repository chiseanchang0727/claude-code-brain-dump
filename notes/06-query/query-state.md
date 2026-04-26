# Query Loop State

Reference: [`src/query.ts:252–279`](../../src/query.ts)

## Why a `State` struct?

The loop has ~9 values that need to survive across `continue` — across iterations. Rather than 9 separate `let` variables scattered through the function, they're grouped into a single `State` object. Every `continue` site writes:

```ts
state = { ...next }  // one atomic reassignment
```

This makes diffs between iterations readable: you can see exactly what a `continue` changes vs. what it preserves.

## Immutable params (never change across iterations, `:252`)

Destructured from `params` once at function entry and never reassigned:

| Name | What it is |
|------|-----------|
| `systemPrompt` | The full assembled system prompt for this turn |
| `userContext` | Key/value map injected into user messages |
| `systemContext` | Key/value map appended to system prompt |
| `canUseTool` | Permission gate function |
| `fallbackModel` | Model to fall back to on 529/overload |
| `querySource` | Where this query originated (e.g. `repl_main_thread`, `agent:builtin:...`) |
| `maxTurns` | Hard cap on tool-call iterations |
| `skipCacheWrite` | Whether to skip prompt cache writes |

## Mutable `State` fields (`:268`)

These change between iterations via `state = next`:

| Field | Initial value | Changes when |
|-------|--------------|--------------|
| `messages` | `params.messages` | Every tool-call iteration — grows with assistant + tool result messages |
| `toolUseContext` | `params.toolUseContext` | Tool refresh (new MCP), queryTracking depth increment |
| `maxOutputTokensOverride` | `params.maxOutputTokensOverride` | Reset to `undefined` after each turn; set by token budget escalation |
| `autoCompactTracking` | `undefined` | Updated after each autocompact run |
| `stopHookActive` | `undefined` | Set when a stop hook is running (prevents re-entry) |
| `maxOutputTokensRecoveryCount` | `0` | Incremented on each max-output-tokens recovery attempt |
| `hasAttemptedReactiveCompact` | `false` | Set to `true` after first reactive compact — prevents spiral |
| `turnCount` | `1` | Incremented by 1 each tool-call iteration |
| `pendingToolUseSummary` | `undefined` | Set when a tool use summary is being generated async |
| `transition` | `undefined` | Records *why* the loop continued (`next_turn`, `reactive_compact_retry`, etc.) — used to detect retry loops |

## Loop-local state (NOT on `State`)

Two values live outside `State` because they only need forward propagation, not the atomic-swap pattern:

**`taskBudgetRemaining`** (`:291`) — tracks remaining API task budget across compaction boundaries. Starts `undefined`. After each compact, it's decremented by the pre-compact context token count. It's loop-local (not on `State`) because there are 7 `continue` sites and threading it through all of them would require touching every one.

**`budgetTracker`** (`:280`) — the token budget accumulator. Created once, mutated in place across iterations. No need to snapshot it.

## The `continue` pattern

When the loop needs to retry (context overflow, compact, token budget continuation), it builds a `next: State` and does:

```ts
state = next
continue   // jumps back to while(true), re-destructures state
```

The `transition` field on `State` records the reason for the continue. This lets later iterations detect "we already tried collapse_drain_retry" and avoid infinite loops:

```ts
if (state.transition?.reason !== 'collapse_drain_retry') {
  // try collapse drain...
}
```

## `toolUseContext` updates within an iteration

`toolUseContext` is the one field that gets reassigned *within* an iteration (not just at `continue` sites):

1. **`:360`** — `queryTracking` depth incremented at iteration start
2. **`:1663`** — tools refreshed if `refreshTools()` returns a new list (new MCP server connected)
3. **`:1673`** — queryTracking merged back for next iteration

The final `toolUseContextWithQueryTracking` is what goes into `next.toolUseContext`.
