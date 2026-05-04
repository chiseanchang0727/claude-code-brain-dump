# Memory Extraction

**File:** `src/services/extractMemories/extractMemories.ts`

The write side of the memory system. Two paths create memory files — they are mutually exclusive within a single turn.

## Path 1 — Direct write (user-initiated)

When the user says "remember this", the main agent (Opus) follows system prompt instructions and writes memory files directly using Write/Edit tools. No forked agent, no delay. The model creates `.md` files with YAML frontmatter and updates `MEMORY.md` inline.

## Path 2 — Auto-extraction (background)

Fires at **stop hook 7b** — after the model stops calling tools, before the loop returns. Invisible to the user.

```
query loop ends
      ↓
stop hook 7b fires
      ↓
runForkedAgent()          ← shares parent's prompt cache (cheap)
  allowed tools:
    Read, Grep, Glob      ← unrestricted
    Bash                  ← read-only commands only
    Edit, Write           ← memory directory only
      ↓
extracts durable memories from last N messages
      ↓
injects "memory saved" notice into main conversation
```

## Mutual exclusion

If the main agent already wrote to memory files this turn (Path 1), the background extractor is **skipped entirely** and the cursor advances. They never run in the same turn.

## Cursor tracking

`lastMemoryMessageUuid` tracks the last message included in an extraction. On the next turn, only messages added since that UUID are processed — not the full history every time. If compaction removes that UUID, falls back to counting all model-visible messages rather than returning 0.

## Overlap guard

Only one extraction runs at a time. If a second extraction triggers while one is running, it's stashed as `pendingContext` and runs as a trailing extraction after the current one finishes — never dropped, never concurrent.
