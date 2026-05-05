# Prompt Cache

**File:** `src/services/api/claude.ts` — `addCacheBreakpoints()`

The prompt cache lets repeated prefixes be read at **0.1× the normal input token price** instead of reprocessed in full. Every turn, and every background fork, is designed around keeping a stable prefix.

## How the cache grows turn by turn

The cache is prefix-based: if the start of your current API call matches a previously cached prefix, those tokens are a cache hit.

`addCacheBreakpoints()` places exactly **one** `cache_control` marker per API call — on the last message. After each turn:

- Everything before the marker → cache read at **0.1× cost**
- New messages added this turn → **full price**
- New marker written at the new tail

Cost per turn only scales with the **delta** — not the full accumulated history.

**Why only one marker?** The internal cache system frees memory at positions not protected by a marker. Two markers would protect an intermediate position unnecessarily. One marker at the tail is correct — the old prefix still hits, the new tail gets written.

## Fork sharing — CacheSafeParams

After each main turn, `saveCacheSafeParams()` stores the five fields that form the cache key into a module-level slot:

```
systemPrompt + userContext + systemContext + toolUseContext + forkContextMessages
```

Background forks — memory extraction, prompt suggestion, autoDream — all read from this slot via `getLastCacheSafeParams()`. Because their prefix is identical to the main conversation's last API call, they get a cache hit on everything except their own new prompt (typically a few hundred tokens).

**Cost impact:** a fork processing 100k tokens of context pays full price for ~200 new tokens and 0.1× for the rest — roughly 90% cheaper than a fresh context.

## Additional Information

### The maxOutputTokens trap

Setting `maxOutputTokens` on a fork can break cache sharing. The thinking config (including `budget_tokens`) is part of the cache key. If the fork's clamped `budget_tokens` differs from the parent's, the cache key differs and the hit is lost. Only set `maxOutputTokens` when cache sharing is not a goal.

### skipCacheWrite

Fire-and-forget forks set `skipCacheWrite: true`, which shifts the marker to the second-to-last message. The fork reads from the parent's cache but doesn't write its own tail — avoiding unnecessary cache pollution.
