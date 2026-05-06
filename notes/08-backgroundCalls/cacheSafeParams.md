# CacheSafeParams `#prompt-cache` `#cost-management`

Reference: [src/utils/forkedAgent.ts](../../src/utils/forkedAgent.ts) (lines 46-68), [src/services/api/claude.ts](../../src/services/api/claude.ts) (`addCacheBreakpoints`, `getCacheControl`)

## Full Cache Structure Per API Call `#prompt-cache`

Every API call has **two cache markers** — one on the system prompt, one on the last message:

```
┌──────────────────────────────────────────────────────────────┐
│  system prompt blocks         ← cache_control marker here    │
│    [attribution header]         (no marker — billing meta)   │
│    [static blocks*]             cache_control: global        │
│    [dynamic blocks]             (no marker — per-session)    │
│                                 * scope drops to org if MCP  │
│                                                              │
│  tools array                  ← NO cache_control markers     │
│    [built-in tools]             (covered by message marker   │
│    [MCP tools if any]            at ephemeral scope)         │
│                                                              │
│  messages                     ← one marker on last message   │
│    [msg1, msg2, ..., msgN]      cache_control: ephemeral     │
│                                 (covers sys + tools + msgs)  │
└──────────────────────────────────────────────────────────────┘
```

### System Prompt Cache (`buildSystemPromptBlocks`, `claude.ts:3213`; `splitSysPromptPrefix`, `api.ts:321`)

The system prompt is split into blocks and each block gets a `cacheScope`:

| Block | Scope | Cached? |
|---|---|---|
| Attribution / billing header | `null` | No |
| CLI prefix (stable identity block) | `null` or `org` | Varies |
| **Static blocks** (before `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`) | `global` | Yes — shared across all users |
| Dynamic blocks (after boundary — git status, memory, etc.) | `null` | No — per-session |

The `global` scope is key: static parts of the system prompt (tool descriptions, base instructions) are cached at **global scope** — the same cache entry is shared across all Claude Code users. You don't pay to warm it yourself.

**What is `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`?** A sentinel string inserted into the system prompt (`constants/prompts.ts:573`) that separates the stable prefix from the per-session suffix. Everything before it can be globally cached; everything after changes per user/session.

### Tool Schema Cache

Built-in tools are sorted and placed before MCP tools (see `tool-interface.md`). The cache marker placement depends on whether MCP tools are present:

**No MCP tools (normal case):**
- System prompt static blocks get `cacheScope: 'global'` — shared across **all** Claude Code users worldwide. Anthropic pre-warms this; your first call of the day is already a cache hit for the system prompt.
- Tool schemas have **no** `cache_control` marker — they are covered by the per-session ephemeral message-level marker. The ephemeral marker on the last message caches system + tools + all prior messages. Tool schemas are stable within a session → cache hit every turn after the first.

**MCP tools present (`needsToolBasedCacheMarker`, `claude.ts:1212`):**
- System prompt blocks drop to `cacheScope: 'org'` — still cached, but only within your account. You lose the cross-user global pre-warm; your first call of the session pays full price to warm the system prompt cache.
- Tool schemas still have **no** `cache_control` marker — same as the no-MCP case, covered by the ephemeral message marker.
- Why the scope downgrade: MCP tools are per-user. If the system prompt kept `global` scope, Anthropic would need to cache a different prefix per user — that's incompatible with cross-user sharing. Dropping to `org` scope limits caching to your account.
- Note: the variable name `needsToolBasedCacheMarker` is aspirational — the intended design was to put an `org`-scoped marker on the last built-in tool (protecting it from MCP-caused cache busting). The current code only implements the scope downgrade on the system prompt. The `GlobalCacheStrategy` value when MCP is present is `'none'` (no global caching), not `'tool_based'`.

### Example: Normal Session (No MCP)

```
API request:
  system: [
    { text: "...base instructions...", cache_control: { type: "ephemeral", scope: "global" } },
    { text: "...git status, memory..." }   ← no marker, dynamic
  ]
  tools: [
    { name: "Bash", ... },
    { name: "Read", ... },
    ...                                    ← no marker needed, inside cached prefix
  ]
  messages: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." },
    { role: "user", content: "...", cache_control: { type: "ephemeral" } }  ← last message
  ]
```

### Example: Session With MCP Tools

```
API request:
  system: [
    { text: "...base instructions...", cache_control: { type: "ephemeral", scope: "org" } },
    { text: "...git status, memory..." }   ← no marker, dynamic
  ]
  tools: [
    { name: "Bash", ... },
    { name: "Read", ... },
    { name: "WebFetch", ... },             ← no cache_control on any tool
    { name: "mcp__github__search", ... },
    { name: "mcp__slack__send", ... },
  ]
  messages: [
    ...
    { role: "user", content: "...", cache_control: { type: "ephemeral" } }  ← last message
  ]
```

System prompt is cached at `org` scope (you warm it yourself, not globally pre-warmed). All tools (built-in + MCP) are covered by the ephemeral message-level marker — same as the no-MCP case, just with org-scoped system prompt instead of global.

---

## How the Cache Grows Turn by Turn `#prompt-cache` `#cost-management`

The cache doesn't stay fixed — it grows with each turn. The key insight is that the cache is **prefix-based**: if the start of your current API call matches a previously cached prefix, those tokens are a cache hit.

`addCacheBreakpoints()` (`src/services/api/claude.ts` line 3063) places **one** `cache_control` marker on the last message of every API call (line 3089: `markerIndex = messages.length - 1`).

```
Turn 1 API call:  [sys, tools, msg1, msg2*]      (* = cache_control marker)
                   └───────────────────────┘
                         cache WRITTEN here

Turn 2 API call:  [sys, tools, msg1, msg2, msg3, msg4*]
                   └────────────────────┘  └──────────┘
                       cache HIT (0.1x)     full price
                                                 ↑
                                        new cache WRITTEN here

Turn 3 API call:  [sys, tools, msg1, msg2, msg3, msg4, msg5, msg6*]
                   └──────────────────────────────────┘  └────────┘
                              cache HIT (0.1x)             full price
```

Each turn you pay:
- **0.1x** for everything from previous turns (cache read on the old prefix)
- **Full price** only for the new messages added this turn
- **Cache write** to extend the cache marker to the new tail

The conversation history grows, but the cost per turn only scales with the **delta** — the new messages — not the full accumulated context.

**Why only one marker?** Mycro (Anthropic's internal cache system) frees KV pages at positions not protected by a cache marker. Two markers would protect an intermediate position unnecessarily, wasting memory. One marker at the tail is the right choice — the old prefix is still a cache hit, and only the new tail needs to be written.

---

## The Problem

Every API call to Claude processes the full message history (system prompt + tools + messages). For a long conversation, this means re-processing hundreds of thousands of tokens per call. When a forked agent (memory extraction, compaction, etc.) starts a new query loop, it would pay the full input token cost again — even though its context is nearly identical to the parent's.

## How Anthropic's Prompt Cache Works

The API caches based on a **prefix key**: system prompt + tools + model + messages (in order) + thinking config. If two API calls share the same prefix, the second one reads from cache instead of reprocessing those tokens. This is **not** KV cache sharing at the GPU level — it's the API's server-side caching feature.

**Cost impact:** cache reads are charged at 0.1x the normal input token price. For a long conversation, a forked agent that shares the parent's prefix pays full price only for its new prompt messages (typically a few hundred tokens) — the rest is nearly free.

Cache control is set per-message via `cache_control: { type: 'ephemeral' }` headers. The `addCacheBreakpoints()` function in `claude.ts` places exactly **one** cache marker per request (on the last message). Why only one? The internal cache system (Mycro) frees KV pages at non-cached positions — two markers would protect an intermediate position unnecessarily.

## CacheSafeParams

> Same pattern as `backfillObservableInput` in the tool execution pipeline — never mutate what gets recorded/cached, operate on a copy instead. See [`09-tools/execution-pipeline.md` — step 6](../../09-tools/execution-pipeline.md).

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

## The maxOutputTokens Trap `#prompt-cache`

Setting `maxOutputTokens` on a fork can **break cache sharing**. Here's why:

- Thinking config (including `budget_tokens`) is part of the cache key
- `claude.ts` clamps `budget_tokens` to fit within `maxOutputTokens`
- If the fork's clamped `budget_tokens` differs from the parent's → different cache key → cache miss

This only affects older models with explicit thinking budgets. Adaptive thinking (Opus 4.6+) is unaffected.

The code warns: only set `maxOutputTokens` when cache sharing is not a goal (e.g., compact summaries that use a different model anyway).

## Global Slot for Post-Turn Forks

`saveCacheSafeParams()` / `getLastCacheSafeParams()` is a module-level slot. After each turn, `handleStopHooks` saves the current params. Post-turn forks (promptSuggestion, postTurnSummary, `/btw`) can grab them without every caller threading params through.

## Mid-Turn Fallback: `side_question` Before First Snapshot `#prompt-cache` `#resilience`

SDK callers can send a `side_question` control message at any time — including mid-turn, before the first turn completes and before `saveCacheSafeParams()` has ever been called. In that case `getLastCacheSafeParams()` returns `null` and the happy path is unavailable.

`buildSideQuestionFallbackParams` (`src/utils/queryContext.ts`) is the recovery: it reconstructs `CacheSafeParams` from scratch by calling `fetchSystemPromptParts` and assembling the system prompt the same way `QueryEngine.ask()` would. It also strips any in-progress assistant message (`stop_reason === null`) from the message list before forking.

The tradeoff: it deliberately skips the coordinator extras and memory-mechanics prompt that `QueryEngine` would inject — those are session-specific and unavailable at this call site. So the rebuilt prefix may not be byte-identical → possible cache miss. But the side question succeeds; without the fallback it would fail entirely.

```
SDK side_question arrives mid-turn
│
├─ getLastCacheSafeParams() → null  (no completed turn yet)
│
└─ buildSideQuestionFallbackParams()
       ├─ fetchSystemPromptParts()   ← base system prompt + user/system context
       ├─ assemble systemPrompt      ← mirrors QueryEngine.ask() assembly
       ├─ strip in-progress message  ← drop assistant msg with stop_reason === null
       └─ build fresh ToolUseContext
              │
              ▼
       runSideQuestion(cacheSafeParams)
       ← may miss cache (no coordinator extras), but succeeds
```

## skipCacheWrite

Fire-and-forget forks (e.g., speculation) set `skipCacheWrite: true`. This shifts the cache marker to the **second-to-last** message instead of the last. The fork doesn't leave its own tail in the cache — it only reads from the parent's existing cache entry, doesn't create a new one.
