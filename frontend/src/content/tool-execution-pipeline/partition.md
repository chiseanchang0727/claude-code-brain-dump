# Concurrency Partition

**File:** `src/services/tools/toolOrchestration.ts` → `partitionToolCalls()`

Both execution modes (streaming and batch) use the same concurrency rules. `partitionToolCalls()` groups the tool list into ordered batches:

- **Consecutive concurrent-safe tools** → one batch, run in parallel (up to `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`, default 10)
- **Any non-concurrent tool** → its own batch of 1, runs alone

**Example:** `[Read, Read, Bash, Read, Read]` → `[{Read, Read}, {Bash}, {Read, Read}]`

Non-concurrent tools (like Bash) run alone because they may modify shared state — files, environment — that other tools depend on.

## Context modifiers

Some tools return a `contextModifier` that updates `ToolUseContext` after they run (e.g. updating permissions, adding working directories). Concurrent tools can't safely modify shared context mid-batch, so their modifiers are queued and applied only after the full batch finishes.

## Sibling abort

When tools run in parallel and one fails, **only Bash tool errors cascade** — `siblingAbortController.abort()` fires, cancelling all sibling subprocesses immediately. The rationale: Bash commands often have implicit dependency chains (`mkdir` fails → subsequent commands are pointless). Other tool failures (Read, WebFetch, etc.) don't cancel siblings — they're independent by nature.

Siblings that get cancelled receive a synthetic error: `"Cancelled: parallel tool call X errored"`.

## Interrupt behavior

When the user types a new message while tools are running, `interruptBehavior()` decides per-tool:

- `'cancel'` — stop immediately, produce a rejection result
- `'block'` — keep running; the new message waits (default)

The sibling abort controller is a **child** of the main abort controller. Aborting it does not abort the parent — so a sibling error doesn't end the turn. Only a full user interrupt (ESC) ends the turn.
