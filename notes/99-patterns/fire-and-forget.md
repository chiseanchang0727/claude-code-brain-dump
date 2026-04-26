# Fire-and-Forget

## The Pattern

In TypeScript, `void someAsyncFunction()` means: call it, don't await the returned Promise, move on immediately.

```typescript
// WAITS for it to finish:
await extractMemories(...)

// Does NOT wait — fire and forget:
void extractMemories(...)
```

`void` tells TypeScript: "I know this returns a Promise. I intentionally don't want to await it. Suppress the linter warning."

The Promise still runs in the background. If it fails, the error must be caught internally (try/catch inside the function) — nobody is awaiting it to catch the rejection.

## Python equivalent

```python
# fire-and-forget
asyncio.create_task(extract_memories(...))
# code continues immediately
```

## Why use it

The main loop can't afford to wait for background work. Waiting would block the user from getting their response. These tasks are either:
- **Best-effort** — if they fail, nothing breaks (memory extraction, prompt suggestions)
- **Non-blocking by design** — the result isn't needed until later or not at all (transcript recording)

## Where it's used

### Stop hooks (`src/query/stopHooks.ts`)
All three post-turn background tasks are fire-and-forget:
- `void executePromptSuggestion(stopHookContext)` (line 139)
- `void extractMemoriesModule!.executeExtractMemories(...)` (line 149)
- `void executeAutoDream(stopHookContext, ...)` (line 155)

### Query loop (`src/query.ts`)
- `void recordContentReplacement(...)` (line 384) — content replacement after compaction
- `void executePostSamplingHooks(...)` (line 1001) — hooks after model response
- `void executeStopFailureHooks(...)` (lines 1174, 1181, 1263) — hooks on error paths

### QueryEngine (`src/QueryEngine.ts`)
- `void fileHistoryMakeSnapshot(...)` (line 645) — snapshot file states for rewind
- `void recordTranscript(messages)` (lines 728, 780, 834) — persist messages to JSONL

### StreamingToolExecutor (`src/services/tools/StreamingToolExecutor.ts`)
- `void this.processQueue()` (line 123) — start processing tools without blocking `addTool()`
- `void promise.finally(() => { void this.processQueue() })` (line 402) — chain next tool processing after completion
