# Recovery / Stop Hooks

**File:** `src/query.ts:1062–1357` — the `!needsFollowUp` branch

Runs when the model produced no tool calls. Contains four sub-steps.

## 7a — Recovery (lines 1085–1256)

Only if the last message was a **withheld error**:

| Error | Recovery chain |
|-------|---------------|
| Prompt too long | collapse drain → reactive compact → surface error |
| Max output tokens | escalate to 64K → inject "resume" message → surface error |
| Media size | reactive compact strip-retry → surface error |

Each recovery is a state machine transition — `state = next; continue` — jumping back to the top of the loop with a modified context.

## 7b — Stop hooks (line 1267)

Fires background tasks before the loop formally exits:

- **Memory extraction** — identifies facts to save to memory files
- **Prompt suggestion** — suggests follow-up prompts
- **Auto-dream** — other background agent tasks
- **User-defined stop hooks** — shell commands configured by the user

These are fire-and-forget — the loop doesn't wait for them.

## 7c — Token budget check (line 1309)

If the model hasn't used its full token budget, nudge it to continue. Uses a diminishing-returns heuristic to avoid infinite nudging.

## 7d — Return completed (line 1357)

Exit the loop with `Terminal.reason = 'end_turn'`.
