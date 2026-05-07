# Understand

**File:** `src/QueryEngine.ts` — step 2 of `submitMessage()`

Parses user input and decides whether to call the API.

## Three paths

| Input | API call? | Example |
|---|---|---|
| Local slash command | No | `/help`, `/clear`, `/model` |
| Hybrid slash command | Yes | `/plan`, `/review` — runs local logic first, then calls API |
| Normal text | Yes | Goes to query loop |

## shouldQuery

```
shouldQuery: false  →  yield result, return (no API)
shouldQuery: true   →  proceed to Save → Run → query loop
```
