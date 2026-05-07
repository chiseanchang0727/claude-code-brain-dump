# Post-tool Work

**File:** `src/query.ts:1538–1628`

Housekeeping after tool results are collected, before the next iteration.

## Steps

1. **Queued commands** — process any notifications that arrived during tool execution
2. **Attachments** — add memory/context files back into the conversation
3. **Memory prefetch** — if background memory lookup finished, add those memories now (don't wait if still loading)
4. **Skill discovery** — add any newly discovered skills
5. **Tool summary** — start a Haiku call to summarize what tools just did (result used next iteration)
