# Result Yielded

**File:** `src/QueryEngine.ts`

After `query()` returns a `Terminal`, `QueryEngine` wraps it into a final result message and yields it to the caller.

## What the result contains

| Field | Description |
|-------|-------------|
| `cost` | Dollar cost of the turn |
| `usage` | Input and output token counts |
| `duration` | Wall-clock time for the turn |
| `errors` | Any non-fatal errors encountered |
| `stopReason` | Why the loop exited (e.g. `end_turn`, `max_turns`) |

## normalizeMessage()

Before yielding, `QueryEngine.normalizeMessage()` (`src/utils/queryHelpers.ts`) cleans up the assistant message — collapsing content blocks, removing internal markers — so the SDK consumer receives a clean, stable shape.
