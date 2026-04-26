# Memory Extraction

Reference: [src/services/extractMemories/extractMemories.ts](../../src/services/extractMemories/extractMemories.ts)

Related: [prefetch.md](./prefetch.md) (the read side), [05-query — Stop hooks](../05-query/execution-flow.md#7b-stop-hooks-line-1267)

## Overview

Memory extraction is the **write side** of the memory system — it automatically creates memory files from the conversation. Fires at step 7b (stop hooks) when the model stops and recovery passes — before the loop formally returns at 7d. See [stop-hooks.md](../05-query/stop-hooks.md) for the full context. Invisible to the user.

There are two paths for creating memories:

## Path 1: Main Agent Writes Directly

When the user explicitly says "remember this", the main model (Opus) follows the instructions in its system prompt to write memory files directly using Write/Edit tools. It creates `.md` files with YAML frontmatter in the memory directory and updates `MEMORY.md`.

## Path 2: Background Auto-Extraction

This is the automatic path. Fires at the end of each query loop (when the model stops calling tools) via stop hooks.

### How it works

1. **Trigger** — `handleStopHooks()` in `src/query/stopHooks.ts` (line 149) calls `void extractMemoriesModule!.executeExtractMemories(stopHookContext, ...)`. Conditions: not bare mode, `EXTRACT_MEMORIES` feature flag on, not a subagent, extract mode active. Same spot also fires `executePromptSuggestion` (line 139) and `executeAutoDream` (line 155) — all three are fire-and-forget forked agents.
2. **Cursor tracking** — keeps a `lastMemoryMessageUuid` so it only looks at messages added since the last extraction
3. **Mutual exclusion** — if the main agent already wrote to memory files this turn (Path 1), the background extraction is **skipped entirely** and the cursor advances past this range
4. **Forked agent** — uses `runForkedAgent()`, a perfect fork of the main conversation that **shares the parent's prompt cache** (cheap — cache hit, not a fresh context). The forked agent gets:
   - Read-only tools (Read, Grep, Glob) + Write/Edit **restricted to the memory directory only**
   - Read-only Bash (ls, find, grep, cat, etc. — no writes)
   - A manifest of existing memories (from `scanMemoryFiles`, same scanner as prefetch)
   - A prompt asking it to extract durable memories from the last N messages
   - Max 5 turns hard cap (typically 2-4: scan existing → write new)
5. **Result** — extracts written file paths from the agent's messages, injects a "memory saved" system message back into the main conversation

### Guards and throttles

- **Overlap guard** — only one extraction runs at a time. If a new request arrives during an in-progress run, it's stashed as `pendingContext` and runs as a "trailing" extraction after the current one finishes
- **Turn throttle** — configurable via feature flag (`tengu_bramble_lintel`, default 1) to run every N eligible turns, not necessarily every turn
- **Cursor fallback** — if `lastMemoryMessageUuid` was removed by context compaction, falls back to counting all model-visible messages rather than returning 0 (which would permanently disable extraction)

### Permission sandbox

The forked agent's `canUseTool` is tightly restricted:

| Tool | Permission |
|------|-----------|
| Read, Grep, Glob | Unrestricted (read-only) |
| Bash | Read-only commands only (ls, find, grep, cat, stat, etc.) |
| Edit, Write | **Only** for paths within the auto-memory directory |
| Everything else | Denied |

This prevents the background extraction from accidentally modifying project code.

## Key Design Decisions

- **Forked agent shares prompt cache** — because it's a fork of the main conversation, the API call reuses the cached context. Cached input tokens are charged at ~0.1x the normal price, making the extraction ~90% cheaper. See [cacheSafeParams.md](../08-backgroundCalls/cacheSafeParams.md).
- **Fire-and-forget** — the main loop never waits for extraction. It's best-effort; errors are logged but don't surface to the user.
- **Mutual exclusion with main agent** — if the user said "remember this" and the main agent already wrote memories, the background extractor doesn't double-write. They are mutually exclusive per turn.
- **Closure-scoped state** — all mutable state (cursor, overlap guard, pending context) lives in a closure created by `initExtractMemories()`, not at module level. This makes testing clean (call `initExtractMemories()` in `beforeEach` for a fresh closure).

## Memory Lifecycle Summary

```
WRITE side (this file):
  User says "remember X" → main agent writes directly (Path 1)
  OR
  Query loop ends → stop hook → forked agent extracts automatically (Path 2)
  
  Both write to: ~/.claude/projects/<path>/memory/*.md

READ side (06-memoryPrefetch.md):
  Query starts → prefetch scans memory headers → Sonnet selects relevant ones
  → injected as attachments into the main conversation
```
