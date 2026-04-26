# Autocompact

**File:** `src/query.ts:454`, `src/services/compact/autoCompact.ts:160`  
**Availability:** Public builds — on by default

The most aggressive strategy. Summarizes the **entire conversation history** into a single compact block, replacing all granular history with one summary.

## Trigger condition

```
tokenUsage >= contextWindow - reservedOutputTokens - 13,000
```

`13,000` is `AUTOCOMPACT_BUFFER_TOKENS` — a safety margin so the API call doesn't fail before compaction runs.

`snipTokensFreed` (from the snip strategy) is **subtracted** from `tokenUsage` before the check, so snip's work is credited.

## Disable conditions

| Method | How |
|--------|-----|
| Environment variable | `DISABLE_COMPACT=true` or `DISABLE_AUTO_COMPACT=true` |
| User config | `autoCompactEnabled: false` |
| Query source guard | Skipped for `querySource === 'session_memory'` or `'compact'` |

The query source guard prevents infinite recursion: autocompact forks an agent to do the summarization. If that agent itself triggered autocompact, it would fork another agent, and so on.

## Circuit breaker

Stops retrying after **3 consecutive failures** (`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`). After that, the error surfaces to the user.

## Trade-off

Autocompact lets long sessions continue that would otherwise hit context limits. The cost is that granular history is lost — the model only sees the summary from the compact boundary onward.
