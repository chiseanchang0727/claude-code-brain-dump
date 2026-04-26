# Token Budget

Reference: [src/query/tokenBudget.ts](../../src/query/tokenBudget.ts), [src/utils/tokenBudget.ts](../../src/utils/tokenBudget.ts)

Related: [execution-flow.md — step 7c](./execution-flow.md#7c-token-budget-check-line-1309)

## Overview

Token budget is a user-facing feature that lets the user say "spend at least N tokens on this." When the model stops naturally (no tool calls) but hasn't used enough tokens yet, the system nudges it to keep going. Step 7c in the query loop — runs after stop hooks (7b), before the final return (7d).

Feature-gated: `TOKEN_BUDGET`.

## How Users Set a Budget

Users type a budget inline with their prompt. Three formats are recognized by `parseTokenBudget()` in `src/utils/tokenBudget.ts`:

| Format | Example | Meaning |
|--------|---------|---------|
| Shorthand at start | `+500k fix the auth bug` | 500,000 tokens |
| Shorthand at end | `fix the auth bug +2m` | 2,000,000 tokens |
| Verbose anywhere | `use 500k tokens on this` | 500,000 tokens |

Multipliers: `k` = 1,000, `m` = 1,000,000, `b` = 1,000,000,000.

The regex is anchored carefully — shorthand only matches at the very start or very end to avoid false positives in natural language (e.g., "add +1k items to the list" shouldn't be interpreted as a budget).

## The Decision Logic

`checkTokenBudget()` runs at step 7c. It receives:
- `tracker` — mutable state tracking continuation history
- `agentId` — if set, this is a subagent (skip budget)
- `budget` — the user's requested token budget (or null)
- `globalTurnTokens` — how many output tokens the model has used this turn

**Decision tree:**

```
checkTokenBudget()
│
├─ agentId set OR budget null OR budget ≤ 0?
│   └─ STOP (no budget tracking for subagents)
│
├─ Is model making diminishing progress?
│   (3+ continuations AND last 2 deltas both < 500 tokens)
│   └─ STOP with diminishingReturns: true
│
├─ Used < 90% of budget AND not diminishing?
│   └─ CONTINUE — inject nudge message
│
├─ Used ≥ 90% of budget?
│   └─ STOP with completion event
│
└─ No continuations yet, no budget?
    └─ STOP (no event)
```

**Two thresholds:**
- `COMPLETION_THRESHOLD = 0.9` — model is "done enough" at 90% of budget
- `DIMINISHING_THRESHOLD = 500` — fewer than 500 new tokens per continuation = model is spinning its wheels

## The Nudge Message

When the decision is `continue`, a system message is injected:

```
Stopped at 45% of token target (450,000 / 1,000,000). Keep working — do not summarize.
```

This is created by `getBudgetContinuationMessage()` and added as a `isMeta: true` user message. The "do not summarize" is important — without it, the model tends to wrap up with a summary instead of doing more work.

## Diminishing Returns Detection

The clever part. After 3+ continuations, if the model produced fewer than 500 tokens in each of the last **two** checks, it's considered diminishing returns. The system stops early rather than burning tokens on a model that's clearly done but keeps producing tiny outputs to satisfy the budget.

```typescript
const isDiminishing =
  tracker.continuationCount >= 3 &&
  deltaSinceLastCheck < DIMINISHING_THRESHOLD &&
  tracker.lastDeltaTokens < DIMINISHING_THRESHOLD
```

Why two consecutive checks (current + previous)? A single low-delta check could just be a short tool result turn. Two in a row means the model is genuinely out of meaningful work.

## BudgetTracker State

```typescript
BudgetTracker = {
  continuationCount: number   // how many times we've nudged
  lastDeltaTokens: number     // tokens produced in previous check
  lastGlobalTurnTokens: number // snapshot for computing delta
  startedAt: number           // for duration tracking
}
```

Created fresh per query via `createBudgetTracker()`. Only the main agent uses it — subagents (`agentId` set) always get `action: 'stop'`.

## State Transition

When continuing, the transition reason is `token_budget_continuation` (one of the 7 transition reasons in the state machine). The state update appends the assistant's response plus the nudge message, then `continue`s back to step 1.

```
state = {
  messages: [...current, ...assistantMessages, nudgeMessage],
  transition: { reason: 'token_budget_continuation' },
  ...
}
continue  // → back to step 1, model sees the nudge and keeps working
```

## Python Analogy

Think of it as a "minimum word count" for an essay. The student (model) writes until they think they're done. The teacher (token budget) checks the word count — if it's under 90%, they hand it back with "keep going, don't just add a conclusion." If the student starts writing one-word sentences (diminishing returns), the teacher accepts it early.
