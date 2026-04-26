# Context Collapse

**File:** `src/query.ts:440`  
**Availability:** Internal only — gated behind `feature('CONTEXT_COLLAPSE')`

Projects a collapsed read-time view over the REPL history. Archived messages are replaced with summary messages stored in a separate collapse store.

## Key insight: projection, not mutation

**The full history still exists.** The model just sees the collapsed view. This is what makes collapses persist across turns: `projectView()` replays the commit log on every loop entry.

Compare to autocompact, which destroys the granular history and replaces it with a summary. Context collapse is **reversible** — the original messages are never deleted.

## How it works

1. A separate **collapse store** holds summary messages alongside the original archived messages
2. Before each API call, `projectView()` applies the collapse store as an overlay on `messagesForQuery`
3. The model sees summaries where detailed history used to be
4. The collapse store is updated when new collapses are committed

## Trigger condition

`feature('CONTEXT_COLLAPSE')` must be on. Internal condition inside `applyCollapsesIfNeeded` — not visible from this repo.

## Why it runs before autocompact

If context collapse brings the context under the autocompact threshold, autocompact becomes a **no-op** and granular history is preserved. This is intentional — context collapse is preferred because it's reversible.
