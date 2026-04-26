# Compaction Strategies

Reference: [`src/query.ts:396–468`](../../src/query.ts), [`src/services/compact/microCompact.ts`](../../src/services/compact/microCompact.ts), [`src/services/compact/autoCompact.ts`](../../src/services/compact/autoCompact.ts)

All four strategies run **every iteration**, in this fixed order, before the API call:

```
snip → microcompact → context collapse → autocompact
```

They are not mutually exclusive — multiple can fire in the same iteration.

## Why they exist

Tool results accumulate every iteration. After 20 tool calls, you have 20 tool results in the message history. Most are irrelevant by then. These strategies decide which ones to throw away to keep the context within the model's window.

---

## 1. Snip compact (`query.ts:401`)

**What:** Surgically removes the least important chunks from history (large/old tool results). Keeps a "protected tail" — recent messages always survive.

**Trigger condition:** Unknown — logic is in `snipCompact.ts` which is not in this repo. Fires only when `feature('HISTORY_SNIP')` is on (compile-time gated, not in public builds).

**Output:** Modified `messagesForQuery` + `snipTokensFreed` (fed into autocompact's threshold so it knows how much was already freed).

---

## 2. Microcompact (`query.ts:414`, `microCompact.ts:253`)

**What:** Clears old tool result content (replaces with a placeholder), keeping only the N most recent. Does NOT summarize — just empties the content.

**Trigger condition — two paths, time-based checked first:**

**Path 1 — Time-based** (`microCompact.ts:267`):
- Fires when the gap since the last assistant message exceeds `gapThresholdMinutes` (from config)
- Reasoning: if the prompt cache TTL (~5 min) has expired, the full prefix will be rewritten on the next API call anyway — so clear old results now to shrink what gets rewritten
- Keeps `keepRecent` most recent tool results (from config), clears the rest
- Skips cached MC path (cache is cold, no point editing it)

**Path 2 — Count/cache-based** (`microCompact.ts:276`):
- Requires `feature('CACHED_MICROCOMPACT')` + model supports cache editing + main thread only (not sub-agents)
- Count threshold from GrowthBook config
- Does NOT modify messages locally — queues cache edits applied at the API layer so the prompt cache prefix stays warm

**Fallback** (`microCompact.ts:292`): if neither path fires (external builds, sub-agents, unsupported models) → no-op, autocompact handles pressure instead.

---

## 3. Context collapse (`query.ts:440`)

**What:** Projects a "collapsed" read-time view over the REPL history — archived messages are replaced with summary messages stored in a separate collapse store. The full history still exists; the model just sees the collapsed projection.

**Trigger condition:** `feature('CONTEXT_COLLAPSE')` must be on. Internal condition inside `applyCollapsesIfNeeded` — unknown from this repo.

**Key insight:** Nothing is yielded here — the collapse is a read-time projection, not a mutation. This is what makes collapses persist across turns: `projectView()` replays the commit log on every loop entry.

**Runs before autocompact** — if collapse gets context under the autocompact threshold, autocompact becomes a no-op and granular history is preserved.

---

## 4. Autocompact (`query.ts:454`, `autoCompact.ts:160`)

**What:** Summarizes the entire conversation history into a single compact block. Most aggressive — replaces granular history with one summary.

**Trigger condition** (`autoCompact.ts:72`):
```
tokenUsage >= contextWindow - reservedOutputTokens - AUTOCOMPACT_BUFFER_TOKENS (13,000)
```
- `DISABLE_COMPACT=true` or `DISABLE_AUTO_COMPACT=true` env vars disable it
- User config `autoCompactEnabled` can disable it
- Skipped for `querySource === 'session_memory'` or `'compact'` (recursion guard — these are forked agents that would deadlock)
- Circuit breaker: stops retrying after 3 consecutive failures (`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`)
- `snipTokensFreed` is subtracted from the token count before threshold check

---

## Summary

| Strategy | Condition | What it removes | In public builds |
|----------|-----------|----------------|-----------------|
| Snip | Unknown (external) | Large/old chunks, surgical | No (`HISTORY_SNIP`) |
| Microcompact | Time gap OR count threshold | Old tool result content | Partial (`CACHED_MICROCOMPACT` gated) |
| Context collapse | Unknown (external) | Archived messages (projection) | No (`CONTEXT_COLLAPSE`) |
| Autocompact | Token count near context window | Everything → one summary | Yes |
