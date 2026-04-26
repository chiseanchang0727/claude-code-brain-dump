# CacheSafeParams

Reference: [src/utils/forkedAgent.ts](../../src/utils/forkedAgent.ts) (lines 46-68), [src/services/api/claude.ts](../../src/services/api/claude.ts) (`addCacheBreakpoints`, `getCacheControl`)

## The Problem

Every API call to Claude processes the full message history (system prompt + tools + messages). For a long conversation, this means re-processing hundreds of thousands of tokens per call. When a forked agent (memory extraction, compaction, etc.) starts a new query loop, it would pay the full input token cost again — even though its context is nearly identical to the parent's.

## How Anthropic's Prompt Cache Works

The API caches based on a **prefix key**: system prompt + tools + model + messages (in order) + thinking config. If two API calls share the same prefix, the second one reads from cache instead of reprocessing those tokens. This is **not** KV cache sharing at the GPU level — it's the API's server-side caching feature.

Cache control is set per-message via `cache_control: { type: 'ephemeral' }` headers. The `addCacheBreakpoints()` function in `claude.ts` places exactly **one** cache marker per request (on the last message). Why only one? The internal cache system (Mycro) frees KV pages at non-cached positions — two markers would protect an intermediate position unnecessarily.

## CacheSafeParams

`CacheSafeParams` captures the five fields that form the cache key:

```
CacheSafeParams = {
  systemPrompt       ← must match parent
  userContext         ← prepended to messages, affects cache
  systemContext       ← appended to system prompt, affects cache
  toolUseContext      ← contains tools, model, thinking config
  forkContextMessages ← the parent's full message history
}
```

When a forked agent inherits these params, its first API call has an identical prefix to the parent → **cache hit** → input tokens are ~90% cheaper (cache reads are charged at 0.1x the normal input token price). Only the fork's new prompt messages (typically a few hundred tokens) are processed at full price.

## How It Flows

```
Main conversation (turn N)
│
│  API call: [systemPrompt, tools, msg1...msgN]
│            └─── cache written here ───┘
│
│  Model responds → stop hooks fire
│
├─→ saveCacheSafeParams({ systemPrompt, tools, messages, ... })
│         │
│         ▼
│   ┌─────────────────────┐
│   │  lastCacheSafeParams │  ← module-level slot (singleton)
│   └─────────────────────┘
│         │
│         ├──→ extractMemories: getLastCacheSafeParams() → runForkedAgent()
│         ├──→ promptSuggestion: getLastCacheSafeParams() → runForkedAgent()
│         ├──→ autoDream: getLastCacheSafeParams() → runForkedAgent()
│         └──→ /btw command: getLastCacheSafeParams() → runForkedAgent()
│                    │
│                    ▼
│              Fork's API call: [same systemPrompt, same tools, msg1...msgN, newPrompt]
│                                └──── cache HIT (0.1x cost) ────┘  └ full price ┘
│
▼
User sees response (never waited for any fork)
```

The slot is written once per turn, read by multiple forks. All forks share the same cache because their prefix is identical to the main conversation's. Only the main conversation saves params — subagents don't overwrite the slot.

## The maxOutputTokens Trap

Setting `maxOutputTokens` on a fork can **break cache sharing**. Here's why:

- Thinking config (including `budget_tokens`) is part of the cache key
- `claude.ts` clamps `budget_tokens` to fit within `maxOutputTokens`
- If the fork's clamped `budget_tokens` differs from the parent's → different cache key → cache miss

This only affects older models with explicit thinking budgets. Adaptive thinking (Opus 4.6+) is unaffected.

The code warns: only set `maxOutputTokens` when cache sharing is not a goal (e.g., compact summaries that use a different model anyway).

## Global Slot for Post-Turn Forks

`saveCacheSafeParams()` / `getLastCacheSafeParams()` is a module-level slot. After each turn, `handleStopHooks` saves the current params. Post-turn forks (promptSuggestion, postTurnSummary, `/btw`) can grab them without every caller threading params through.

## skipCacheWrite

Fire-and-forget forks (e.g., speculation) set `skipCacheWrite: true`. This shifts the cache marker to the **second-to-last** message instead of the last. The fork doesn't leave its own tail in the cache — it only reads from the parent's existing cache entry, doesn't create a new one.
