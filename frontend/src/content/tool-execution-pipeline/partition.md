# Concurrency Partition

**File:** `src/services/tools/toolOrchestration.ts` → `partitionToolCalls()`

Groups tools into ordered batches for execution:

- **Consecutive concurrent-safe tools** → one batch, run in parallel
- **Any non-concurrent tool** → its own batch, runs alone

**Example:** `[Read, Read, Bash, Read, Read]` → `[{Read, Read}, {Bash}, {Read, Read}]`

## Context modifiers

Some tools return a `contextModifier` that updates `ToolUseContext` after they run. Concurrent tools queue their modifiers — applied only after the batch finishes.

## Sibling abort

Only Bash errors cascade to cancel siblings. Other tool failures don't — they're independent by nature.
