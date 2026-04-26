# Async Prefetch / Hidden Latency

Reference: [src/query.ts](../../src/query.ts)

The query loop follows a consistent pattern: **start async work early, consume it when you need it, never block the main loop.** Three subsystems use this:

- **Memory prefetch** (`startRelevantMemoryPrefetch`) — fired once before the loop starts. Runs a side query to find which memory files are relevant to this conversation. Consumed post-tools; if not settled yet, skips and retries on the next iteration. Uses TypeScript `using` (like Python's `with`) for automatic cleanup/telemetry on any generator exit path. See [06-memory/prefetch.md](../06-memory/prefetch.md) for details.
- **Skill discovery prefetch** (`startSkillDiscoveryPrefetch`) — fired per-iteration. Discovers relevant skills while the model streams and tools execute. Consumed post-tools.
- **Tool use summary** (`generateToolUseSummary`) — fired after tools complete on iteration N. A Haiku call that generates a human-readable summary of what tools did. Consumed at the start of iteration N+1, by which time the ~1s Haiku call has resolved under the 5-30s of model streaming.

All three follow the same shape: start async → do other work → poll/await result → inject as attachment. The user never waits for any of them.

## Where in the execution flow

| Prefetch | Start | Consume |
|----------|-------|---------|
| Memory prefetch | Before the loop (line 301) | Step 10 — post-tool (line 1600) |
| Skill discovery | Step 1 (line 331) | Step 10 — post-tool (line 1620) |
| Tool use summary | Step 10 of pass N (line 1469) | Step 6 of pass N+1 (line 1055) |
