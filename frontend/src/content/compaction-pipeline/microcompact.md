# Microcompact

**File:** `src/query.ts:414`, `src/services/compact/microCompact.ts:253`

Clears old tool result content by replacing it with a placeholder. Does **not** summarize — it just empties the content of old results, keeping only the N most recent.

## Two trigger paths

### Path 1 — Time-based (`microCompact.ts:267`)

Fires when the gap since the last assistant message exceeds `gapThresholdMinutes` (from config).

**Reasoning:** if the prompt cache TTL(Time-To-Live) (~5 min) has expired, the full prefix will be rewritten on the next API call anyway — clearing old results now shrinks what gets rewritten.

- Keeps `keepRecent` most recent tool results
- Clears the rest
- Skips cached microcompact path (cache is cold, no point)

### Path 2 — Count/cache-based (`microCompact.ts:276`)

Requires all of:
- `feature('CACHED_MICROCOMPACT')` enabled
- Model supports cache editing
- Main thread only (not sub-agents)

Does **not** modify messages locally. Instead, queues cache edits applied at the API layer so the **prompt cache prefix stays warm** — this is the key difference from Path 1.

## Fallback

If neither path fires (external builds, sub-agents, unsupported models) → **no-op**. Autocompact handles the pressure instead.

## Why "micro"?

Unlike autocompact which replaces the entire history with a summary, microcompact makes targeted edits — only old tool result *content* is cleared, not the message structure or metadata.
