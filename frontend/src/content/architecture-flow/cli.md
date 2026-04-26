# CLI Bootstrap

**File:** `src/entrypoints/cli.tsx`

Entry point for the whole process. Two responsibilities:

## Fast paths

Before anything expensive loads, the CLI handles flags that don't need a full session:

- `--version` — print version and exit
- `--dump-system-prompt` — print the system prompt and exit (**Doesn't work, most likely internal-only**)

These exit immediately, no QueryEngine created.

## Normal path

If no fast path matches, hands off to `main.tsx` to set up Commander.js and start the session.