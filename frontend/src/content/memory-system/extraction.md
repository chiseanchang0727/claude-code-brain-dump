# Memory Extraction

The write side of the memory system. Two paths create memory files — they are mutually exclusive within a single turn.

## Path 1 — Direct write (user-initiated)

When the user says "remember this", the main agent (Opus) follows system prompt instructions and writes memory files directly using Write/Edit tools. No forked agent, no delay. The model creates `.md` files with YAML frontmatter and updates `MEMORY.md` inline.

## Path 2 — Auto-extraction (background)

Runs automatically after every model response, invisible to the user. A background agent wakes up, reviews the recent conversation, and writes any durable facts it finds to the memory directory.

The background agent runs with a restricted tool set — it can read anything but can only write to the memory directory. It reuses the parent conversation's cached context, so the API call is cheap. After it finishes, a "memory saved" notice is injected into the main conversation so the model knows what was captured.

## Mutual exclusion

If the main agent already wrote to memory files this turn (Path 1), the background extractor is **skipped entirely** and the cursor advances. They never run in the same turn.

## Cursor tracking

`lastMemoryMessageUuid` tracks the last message included in an extraction. On the next turn, only messages added since that UUID are processed — not the full history every time. If compaction removes that UUID, falls back to counting all model-visible messages rather than returning 0.

## Overlap guard

Only one extraction runs at a time. If a second extraction triggers while one is running, it's stashed as `pendingContext` and runs as a trailing extraction after the current one finishes — never dropped, never concurrent.

**File:** `src/services/extractMemories/extractMemories.ts`