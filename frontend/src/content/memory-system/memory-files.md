# Memory Files

**Location:** `~/.claude/projects/<working-dir>/memory/*.md`

Individual markdown files, one per memory. Each file has YAML frontmatter that acts as the searchable index — the prefetch system reads only the frontmatter, not the full content, when scanning for relevant memories.

## Frontmatter structure

```yaml
---
name: Short title
description: One-line hook — used to decide relevance during prefetch
type: user | feedback | project | reference
---

Memory content here...
```

The `description` field is what Sonnet reads when selecting which memories to surface. It should be specific enough to distinguish this memory from others.

## MEMORY.md

A pointer index file listing all memories with one-line summaries. Always loaded into context — kept concise (lines past 200 are truncated).

## Memory types

| Type | What it captures |
|---|---|
| `user` | Who the user is — role, expertise, preferences |
| `feedback` | How to behave — corrections and confirmed approaches |
| `project` | Ongoing work, decisions, deadlines |
| `reference` | Where to find things in external systems |
