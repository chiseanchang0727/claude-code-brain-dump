# messagesForQuery

**File:** `src/query.ts:365–468`

The array of messages sent to the Claude API each iteration. It starts as a slice of the full conversation history and is then processed by up to four compaction strategies before the API call.

## Why compaction is needed

Tool results accumulate every iteration. After 20 tool calls, the message history contains 20 tool results — most of which are irrelevant by then. Without compaction, the context window fills up and the API call fails.

## Key properties

- **All four strategies run every iteration**, in fixed order, before every API call
- **They are not mutually exclusive** — multiple can fire in the same iteration
- The order matters: earlier strategies can reduce pressure enough that later ones become no-ops

## The pipeline order

```
snip → microcompact → context collapse → autocompact
```

Each strategy is progressively more aggressive. The goal is to use the least aggressive strategy that keeps the context within the model's window.
