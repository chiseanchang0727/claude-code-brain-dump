# Streaming Result Handling

Reference: [`src/query.ts:659–997`](../../src/query.ts)

After `queryModelWithStreaming()` starts, the loop reacts to everything that comes out of the stream. This file maps every condition checked on the streaming output and what each triggers.

## The stream loop structure (`:659`)

```ts
for await (const message of deps.callModel({ ... })) {
  // inside: per-message conditions
}
// outside: post-stream conditions
```

There are two layers — conditions checked **inside** the `for await` (per message, while streaming) and conditions checked **after** the loop ends (on the full result).

---

## Inside the stream — per message

### 1. Streaming fallback occurred (`:712`)
**Signal:** `streamingFallbackOccured = true` (set via `onStreamingFallback` callback)
**Trigger:** the model switched from streaming to non-streaming mid-response

**What happens:**
- Yield `tombstone` for every already-yielded assistant message (removes them from UI + transcript)
- Reset `assistantMessages`, `toolResults`, `toolUseBlocks`, `needsFollowUp`
- Discard the `StreamingToolExecutor` and create a fresh one (prevents orphan tool_use_ids leaking into retry)
- Continue processing the new non-streaming response

See [tombstone.md](./tombstone.md) for details.

---

### 2. Backfill observable input (`:742`)
**Signal:** `message.type === 'assistant'` + tool has `backfillObservableInput`

**Why two copies exist:**

The `tool_use` block the model returns serves two audiences with conflicting needs:

**Copy 1 — original, sent back to Claude API:**
Must be byte-for-byte identical to what the API originally returned. Any change breaks the prompt cache, forcing a full re-tokenization and costing money. This copy is never modified.

**Copy 2 — clone, yielded to hooks / SDK / transcript:**
Needs enriched, absolute information for safe and correct execution. Example: the model sends `file_path: "~/foo.ts"`. A hook with an allowlist for `/home/sean/` would not match `~` — so the relative path could bypass security checks. The clone expands it to `/home/sean/foo.ts` before anyone outside the loop sees it.

```
original  →  back to Claude API       (bytes unchanged → cache hit → save money)
clone     →  hooks / SDK / transcript (absolute paths → safe execution)
```

Each tool defines its own `backfillObservableInput()`. Two use cases exist:

**Use case 1 — security: path expansion** (`FileReadTool`, `FileWriteTool`, `FileEditTool`):
```ts
backfillObservableInput(input) {
  input.file_path = expandPath(input.file_path)  // ~/foo.ts → /home/sean/foo.ts
}
```
All three file tools do the same thing. A hook allowlist for `/home/sean/` wouldn't match `~` — expanding to absolute prevents bypass.

**Use case 2 — shape enrichment** (`SendMessageTool`):
```ts
// model sends compact format:     { to: '*', message: 'hello' }
// clone gets richer typed format: { to: '*', message: 'hello', type: 'broadcast', content: 'hello' }

// model sends:  { to: 'agent-1', message: 'hello' }
// clone gets:   { ..., type: 'message', recipient: 'agent-1', content: 'hello' }
```
The model uses a compact `to` + `message` format. The backfill adds `type`, `recipient`, `content` — a more structured shape that hooks and SDK consumers can work with directly.

The clone is only yielded if backfill **added** new fields — not just overwrote existing ones. Overwrites would change the transcript bytes and break session resume fixture hashes.

---

### 3. Withhold recoverable errors (`:799`)
**Signal:** message matches one of:
- `contextCollapse?.isWithheldPromptTooLong()` — 413 error, context collapse can recover
- `reactiveCompact?.isWithheldPromptTooLong()` — 413 error, reactive compact can recover
- `reactiveCompact?.isWithheldMediaSizeError()` — oversized image/PDF, reactive compact can recover
- `isWithheldMaxOutputTokens()` — model hit output token limit, truncation retry can recover

**What happens:** `withheld = true` → message is **not yielded** to the caller. Still pushed to `assistantMessages` so post-stream recovery logic can find it.

Recovery is attempted after streaming ends (see post-stream section below).

---

### 4. tool_use block found → start execution (`:829`)
**Signal:** `message.type === 'assistant'` + content contains `tool_use` blocks

**What happens:**
- Push tool blocks to `toolUseBlocks`
- `needsFollowUp = true` ← the loop continuation signal
- If `StreamingToolExecutor` exists: `addTool()` immediately → tool starts executing in parallel while model keeps streaming

This is the core of streaming tool execution — tools don't wait for the model to finish. See [streaming-tool-execution.md](./streaming-tool-execution.md).

---

### 5. Poll for completed tool results (`:847`)
**Signal:** every message iteration, if `StreamingToolExecutor` exists

**What happens:** `getCompletedResults()` — non-blocking poll. Any tools that finished while the model was streaming are yielded immediately and pushed to `toolResults`.

---

## After the stream — post-stream conditions

### 6. Cached microcompact boundary message (`:870`)
**Signal:** `feature('CACHED_MICROCOMPACT')` + `pendingCacheEdits` exists

**What happens:** Yields a boundary message with the actual `cache_deleted_input_tokens` from the API response (more accurate than client-side estimates computed before the request).

---

### 7. FallbackTriggeredError — model switch (`:894`)
**Signal:** `innerError instanceof FallbackTriggeredError` + `fallbackModel` exists

**What happens:**
- Switch `currentModel` to `fallbackModel`
- `yieldMissingToolResultBlocks` for any orphaned tool_use blocks
- Reset `assistantMessages`, `toolResults`, `toolUseBlocks`, `needsFollowUp`
- Discard + recreate `StreamingToolExecutor`
- Strip thinking signature blocks if `USER_TYPE === 'ant'` (thinking blocks are model-bound — replaying to a different model causes 400)
- Yield a warning system message: "Switched to X due to high demand for Y"
- `continue` → retry the entire API call with the fallback model

---

### 8. Unexpected error (`:955`)
**Signal:** any throw not caught above

**What happens:**
- `yieldMissingToolResultBlocks` — safety net for orphaned tool_use blocks
- Yield an `AssistantAPIErrorMessage` with the error content
- `return { reason: 'model_error', error }`

---

### 9. Abort after streaming (`:1015`)
**Signal:** `toolUseContext.abortController.signal.aborted`

**What happens:**
- If `StreamingToolExecutor`: `getRemainingResults()` — generates synthetic `tool_result` blocks for in-progress tools
- Else: `yieldMissingToolResultBlocks` with "Interrupted by user"
- Yield `createUserInterruptionMessage` (unless abort reason is `'interrupt'` — submit-interrupt already provides context)
- `return { reason: 'aborted_streaming' }`

---

### 10. Withhold-then-recover: 413 / media errors (`:1062`)
**Signal:** `!needsFollowUp` + last message `isWithheld413` or `isWithheldMedia`

**Recovery attempts in order:**
1. Context collapse drain (if `CONTEXT_COLLAPSE` feature on + not already tried)
2. Reactive compact (if `reactiveCompact` available)

If recovery succeeds → `state = next; continue` (retry the turn with compacted context).
If all recovery fails → yield the withheld error message + `return { reason: 'prompt_too_long' | 'image_error' }`.

See [withhold-then-recover.md](./withhold-then-recover.md) for details.

---

## Summary map

```
per-message (inside for-await):
  streamingFallbackOccured    → tombstone + reset + continue streaming
  backfillObservableInput     → clone message before yield
  withheld error              → suppress yield, save for recovery
  tool_use blocks             → needsFollowUp=true + addTool() (parallel exec)
  poll completedResults       → yield finished tool results early

post-stream:
  pendingCacheEdits           → yield microcompact boundary message
  FallbackTriggeredError      → switch model + retry entire request
  unexpected throw            → yieldMissing + return model_error
  abortController.aborted     → synthetic results + return aborted_streaming
  withheld 413/media          → recovery attempts → retry or surface error
```
