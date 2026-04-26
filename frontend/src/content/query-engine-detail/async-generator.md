# QueryEngine ↔ query loop

`query()` is an **async generator** — it doesn't wait until the end to return everything. It yields each message as it arrives, one at a time.

## The for-await loop

QueryEngine consumes it like this:

```ts
for await (const message of query(params)) {
  // wakes up once per yielded message, while loop is still running
  recordTranscript(message)
  yield message  // pass it up to the UI
}
// only reaches here when query() returns Terminal
```

## Lockstep, not sequential

They alternate control — one active, one waiting — never both running at the same time:

| query() loop | QueryEngine |
|---|---|
| running | waiting (parked at `for await`) |
| `yield message` → | wakes up |
| waiting | records transcript, yields to UI |
| resumes ← | parks again at `for await` |
| … | … |
| `return Terminal` | `for await` exits |

## One drives, one reacts

The loop drives the pace. QueryEngine reacts to each message as it arrives.

> `query()` is the **producer**. QueryEngine is the **consumer**. They run in lockstep.

This is why you see `recordTranscript` calls inside QueryEngine's loop body rather than inside `query.ts` — the transcript is written by the consumer as each message surfaces, not by the producer deep inside the loop.
