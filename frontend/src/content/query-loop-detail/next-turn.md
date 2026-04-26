# State → continue

**File:** `src/query.ts:1727` — `next_turn` transition

The final step when tools were called. Builds the next `State` and jumps back to the top of the loop.

## The transition

```ts
state = {
  messages: [
    ...messagesForQuery,
    ...assistantMessages,
    ...toolResults,
  ],
  transition: 'next_turn',
  turnCount: turnCount + 1,
  // ...other fields unchanged
}
continue  // jump back to top of while(true)
```

## What the model sees next

On the next iteration, the model receives the **full accumulated context**:

- Original messages
- Every previous assistant response
- Every tool result so far

The model re-evaluates with complete information: call more tools, or stop? **The model decides, not the loop.**

## This is the core of agentic behavior

```
user submits once
  └─► iter 1: model calls tools → needsFollowUp=true → next_turn
  └─► iter 2: model calls tools → needsFollowUp=true → next_turn
  └─► iter 3: model stops       → needsFollowUp=false → return
```

The user submits once. The loop drives itself across N iterations until the model produces a response with no tool calls.
