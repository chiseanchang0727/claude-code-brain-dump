# Commander.js Setup

**File:** `src/main.tsx`

Reads user input from the command line, interprets it using Commander.js, and then initializes the application (session) accordingly.

## What it does

- Parses flags and positional arguments from `process.argv`
- Sets up session metadata (session ID, working directory, model)
- **Creates the `QueryEngine` instance that will drive the entire conversation**
- Wires up stdin/stdout for interactive or piped usage

## Example

**Command**

```bash
claude -p "summarize this file the notes/06-query/README.md" \
  --model claude-opus-4-7 \
  --max-turns 5
```

```bash

This README documents the **Query Loop** subsystem (`src/query.ts`), which is the agentic loop that `QueryEngine.submitMessage()` delegates to.

Key points:

- **`query()` vs `queryLoop()`** — `query()` is a thin wrapper around `queryLoop()` (the `while(true)` loop). Its only added job is firing `notifyCommandLifecycle('completed')` on normal exits.
- **`State` struct** — A single object carries 9+ fields between iterations. Each `continue` does one atomic `state = { ...next }` reassignment.
```