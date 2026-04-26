# Memory Prefetch

Reference: [src/memdir/findRelevantMemories.ts](../../src/memdir/findRelevantMemories.ts), [src/utils/attachments.ts](../../src/utils/attachments.ts)

Related: [05-query / async-prefetch.md](../05-query/async-prefetch.md)

## Overview

Memory prefetch decides which memory files are relevant to the current conversation — without blocking the main loop. It runs as one of the three async prefetch subsystems described in `05-query.md`.

## How It Works

### 1. Guard checks (`startRelevantMemoryPrefetch` in attachments.ts)

Before firing the prefetch, several guards are checked:
- Auto-memory must be enabled
- Feature flag must be on
- Single-word queries are skipped (too ambiguous to match)
- Session byte limit not exceeded

If all pass, it extracts the last user message and creates an AbortController for cancellation.

### 2. Scan memory headers (`scanMemoryFiles`)

Reads only the YAML frontmatter (name, description, type) from every `.md` file in the memory directory. Does NOT read file contents — just the metadata. This produces a lightweight manifest of what memories exist.

Files already surfaced in prior turns are filtered out before the next step, so the 5-slot budget isn't wasted re-picking files the caller would discard.

### 3. Ask Sonnet to select (`selectRelevantMemories`)

Fires a `sideQuery()` — a lightweight API call to **Sonnet** (not Opus) — with:
- **System prompt:** instructions to select up to 5 clearly useful memories
- **User message:** the user's query + formatted manifest (filename + description for each memory) + list of recently-used tools
- **Structured JSON output:** schema forces `{ selected_memories: ["file1.md", ...] }`

Why Sonnet? It's cheaper and faster than Opus — good enough for a relevance filter task.

### 4. Validate and return

Sonnet's returned filenames are filtered against the set of real filenames. Hallucinated filenames are silently dropped. Returns up to 5 `{ path, mtimeMs }` results.

## Key Design Decisions

- **Header-only scan** — reading full file contents for every memory would be expensive. Frontmatter descriptions are the "index" that Sonnet searches against.
- **Abort-safe** — if the user interrupts or the signal is aborted, returns empty quietly (no errors surfaced).
- **Recently-used tools filter** — if Claude Code is actively using a tool (e.g., `mcp__X__spawn`), Sonnet is told NOT to select reference docs for that tool (already in context). But warnings/gotchas about those tools ARE still selected — active use is exactly when those matter.
- **Never blocks** — runs in parallel with API streaming and tool execution. Consumed post-tools; if not settled yet, skipped and retried next iteration.

## Analogy

Think of it like a librarian (Sonnet) who reads the card catalog (frontmatter) to pick 5 relevant books (memory files) while you (Opus) are busy talking to the user. By the time you need the books, they're already on the desk.
