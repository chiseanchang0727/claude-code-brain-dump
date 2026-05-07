# QueryEngine ↔ query loop

> `query()` is the **producer**. QueryEngine is the **consumer**. The loop drives the pace — QueryEngine reacts to each message as it arrives.


## Why two layers

Each layer has a distinct responsibility:

- **QueryEngine** — **session level**, answers *what does a session remember?* Holds the full message history, accumulated cost, and permission state across every turn.
- **query loop** — **turn level**, answers *what happens each iteration?* Drives the model call, tool execution, and streaming for a single turn, then hands the results back up.

Splitting them means session state never leaks into the loop, and the loop never needs to know how long the conversation has been running.

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


