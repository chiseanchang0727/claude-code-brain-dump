# Post-tool Work

**File:** `src/query.ts:1538–1628`

After tool results are collected, several housekeeping tasks run before the next iteration begins.

## Steps in order

### Queued commands (line 1570)
Drains pending notifications scoped to this agent's ID. Commands queued during tool execution are processed here.

### Attachments (line 1580)
Injects memory and context attachments back into the message stream so the model receives them on the next iteration.

### Memory prefetch consume (line 1600)
If memory prefetch has settled (started earlier, asynchronously), inject relevant memories into the context now. If not yet ready, skip and retry on the next iteration — **zero wait**.

### Skill discovery consume (line 1620)
Inject prefetched skill discovery results if available. Skills discovered during the turn become available for subsequent tool calls.

### Tool use summary start (line 1469)
Fires off an async **Haiku** call to generate a human-readable summary of the tool calls just executed. This result is consumed at **step 6 of the next iteration** — by the time the next API call finishes streaming, the summary is ready.
