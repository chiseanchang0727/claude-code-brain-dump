# Memory Prefetch

**File:** `src/memdir/findRelevantMemories.ts`

The read side of the memory system. Selects which memory files are relevant to the current conversation and injects them as attachments — without blocking the main query loop.

## Flow

```
user sends message
      ↓
scan memory/*.md headers only   ← no full file reads
      ↓
sideQuery() to Sonnet           ← cheap, not Opus
  input: user query + manifest (name + description per file)
  output: { selected_memories: ["file1.md", ...] }
      ↓
read full content of selected files (up to 5)
      ↓
injected as attachments into the conversation
```

## Why headers only

Reading full file contents for every memory would be expensive. The frontmatter `description` fields are the "card catalog" that Sonnet searches against — fast and cheap.

## Why Sonnet, not Opus

Selecting relevant files from a list is a simple relevance-matching task. Sonnet is faster and cheaper than Opus, good enough for a filter step.

## Never blocks

Runs in parallel with API streaming and tool execution. If it hasn't settled by the time results are needed, it's skipped for that iteration and retried next turn.

## Staleness warning

Memory files older than 1 day get a `<system-reminder>` prepended warning that citations may be outdated. Fresh memories get nothing — the warning would be noise.

## Guards

- Single-word queries are skipped (too ambiguous)
- Files already surfaced in prior turns are filtered out before Sonnet sees the manifest
- Hallucinated filenames from Sonnet are silently dropped
