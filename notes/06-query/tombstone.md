# Tombstone (Orphaned Messages on Fallback)

Reference: [src/query.ts](../../src/query.ts) (lines 712-740), [src/services/api/claude.ts](../../src/services/api/claude.ts)

Separate from the state machine and withhold-then-recover. This handles a different failure: **streaming fails mid-response** and the system falls back to non-streaming mode.

**The problem:** During streaming, Claude sends messages piece by piece (thinking blocks, text, tool calls). Midway through, the connection **fails** — network error, 404, or watchdog timeout. The API layer retries in non-streaming mode. But the first (failed) attempt already produced **partial assistant messages** in `assistantMessages[]` with:
- Unique message IDs that won't match the retry's messages
- Thinking block signatures that are invalid (partial/incomplete)
- Tool use IDs that don't match anything in the new response

If kept: "thinking blocks cannot be modified" API errors, ghost messages in UI, orphan `tool_result`s referencing stale `tool_use_id`s.

**The solution** (lines 712-740):

```
1. Streaming starts → partial messages accumulate in assistantMessages[]
2. Stream fails → fallback to non-streaming
3. onStreamingFallback fires → sets streamingFallbackOccured = true
4. Non-streaming response arrives as new messages
5. Loop detects streamingFallbackOccured:
   a. Yields { type: 'tombstone', message } for each orphaned message
      → UI removes them, transcript marks them dead
   b. Clears assistantMessages[], toolResults[], toolUseBlocks[]
   c. Discards the StreamingToolExecutor and creates a fresh one
      → prevents orphan tool_results with stale tool_use_ids
6. Continues with clean state, processing only the new response
```

The tombstone yield tells the caller (QueryEngine/UI): "these messages I gave you earlier? Pretend they never happened — remove them." It's a retraction mechanism.

Think of it like: you're writing a letter, the paper rips halfway, so you throw it away (tombstone) and start on a fresh sheet (non-streaming retry). You don't try to tape the torn pieces to the new letter.

**Two fallback triggers** in `claude.ts`:
1. **Streaming error** — stream connection fails mid-response (network, timeout, watchdog kill)
2. **404 on stream creation** — streaming endpoint returns 404, all retries exhausted
