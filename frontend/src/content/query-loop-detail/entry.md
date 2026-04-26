# queryLoop()

**File:** `src/query.ts:241` — `while(true)` at `:307`

The core agentic loop. An async generator — it `yield`s messages and stream events to the caller as they happen, and `return`s a `Terminal` (the exit reason) when done.

## query() vs queryLoop() — the split

```
query()         ← public API, thin wrapper
  └─ queryLoop()  ← actual while(true) loop
```

`query()` adds one thing on top of `queryLoop()`: when the loop exits normally (no throw, no `.return()`), it fires `notifyCommandLifecycle(uuid, 'completed')` for any queued commands consumed during the turn. Errors and aborts bypass this.

## The State struct

Instead of 9 separate `let` variables, the loop carries a single `State` object. At every `continue` site:

```ts
state = { ...next }  // one atomic reassignment
```

This makes it easy to see exactly what changes between iterations. Fields include: `messages`, `toolUseContext`, `autoCompactTracking`, `turnCount`, `transition`.

## Why while(true)?

The loop doesn't know in advance how many iterations it will need. The model decides: it may call 0 tools (exits immediately) or 50 tools (runs 50 iterations). The `while(true)` lets the model drive the iteration count.
