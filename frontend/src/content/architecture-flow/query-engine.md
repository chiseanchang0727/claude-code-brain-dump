# QueryEngine

**File:** `src/QueryEngine.ts:209` — `submitMessage()`

The entry point for each conversation turn. It owns session-level state and delegates per-turn execution to `query.ts`.

## What it owns

- Message history across turns
- Cumulative token usage and cost
- Permission denial tracking
- Transcript recording

## Per-turn flow

Each call to `submitMessage()` does:

1. Call `fetchSystemPromptParts()` to compose the system prompt
2. Call `processUserInput()` to parse the message, handle `/slash` commands, decide if an API call is needed
3. Call `recordTranscript()` to persist the user message before the API call
4. Delegate to `query()` for the API + tool execution loop
5. Receive the `Terminal` back, normalize the final message, yield the result

## Relationship to query.ts

`QueryEngine` owns **session state**. `query.ts` owns **per-turn execution state** (the `State` struct, compact tracking, turn count). They are cleanly separated.
