# Memory System

The memory system has two sides: reading relevant memories into context, and extracting new memories from conversations.

## Contents

- [prefetch.md](./prefetch.md) — Read side: how relevant memories are selected and injected (Sonnet side query)
- [extraction.md](./extraction.md) — Write side: how memories are automatically created (forked agent + direct writes)
- Prefetch uses **sideQuery** (single API call), extraction uses **forkedAgent** (full query loop). See [08-backgroundCalls](../08-backgroundCalls/README.md) for details.

## Lifecycle

```
WRITE side (extraction.md):
  User says "remember X" → main agent writes directly
  OR
  Query loop ends → stop hook → forked agent extracts automatically

  Both write to: ~/.claude/projects/<path>/memory/*.md

READ side (prefetch.md):
  Query starts → prefetch scans memory headers → Sonnet selects relevant ones
  → injected as attachments into the main conversation
```
