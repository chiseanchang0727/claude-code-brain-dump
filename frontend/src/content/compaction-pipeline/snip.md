# Snip Compact

The most surgical strategy. Removes the least important chunks from history while protecting recent messages.

## What it does

- Identifies large or old tool results that are unlikely to be referenced again
- Removes them from `messagesForQuery`
- Keeps a **protected tail** — the most recent N messages always survive

## Output

Produces two things:
- Modified `messagesForQuery` with low-value chunks removed
- `snipTokensFreed` — a count of tokens removed, fed into autocompact's threshold check so autocompact knows how much pressure has already been relieved

## Trigger condition

Unknown — logic lives in `snipCompact.ts` which is not in this repo. The strategy only runs when `feature('HISTORY_SNIP')` is enabled at compile time. **Not available in public builds.**

## Why surgical removal?

Unlike microcompact (which empties content) or autocompact (which replaces everything with a summary), snip removes entire message chunks. This preserves the structure of remaining messages while freeing the most tokens per operation.

**File:** `src/query.ts:401`  
**Availability:** Internal only — gated behind `feature('HISTORY_SNIP')`