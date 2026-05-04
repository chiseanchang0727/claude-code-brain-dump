# Understand

**File:** `src/QueryEngine.ts` — step 2 of `submitMessage()`

The Understand step reads what the user sent and decides what to do with it before any API call is made. `shouldQuery` is returned by `processUserInput()` (line 412).

## Three paths

### Local slash command
`/help`, `/clear`, `/config`, `/model` — handled entirely client-side. `shouldQuery: false`. The output is yielded directly and the turn ends. No tokens consumed, no API latency.

### Hybrid slash command
`/plan`, `/review`, `/thinkback` — runs local logic first, then sets `shouldQuery: true`. The command does its own work (e.g. building a structured prompt), then the result is forwarded to the model for a follow-up API call.

### Normal user input
Always `shouldQuery: true`. Goes straight through Save → Run to the query loop.

## shouldQuery

```
shouldQuery: false  →  yield result, return early (no API)
shouldQuery: true   →  proceed to Save → Run → query loop
```

The rule is not "slash command = no API" — it depends on what the command declares. Some slash commands explicitly opt in to a model follow-up.
