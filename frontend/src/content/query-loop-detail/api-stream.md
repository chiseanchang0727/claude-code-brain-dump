# API Call + Stream

**File:** `src/query.ts:658–864` — `queryModelWithStreaming()`

Sends the current messages to the Claude API and streams the response back. The outer loop is `while (attemptWithFallback)` — it runs once normally, and a second time if the primary model falls back.

## What happens during streaming

For each SSE event that arrives from the API:

- **Text deltas** are yielded to the caller immediately so the UI can display partial responses in real time
- **`tool_use` blocks** are collected into `toolUseBlocks` and fed to the streaming executor as they arrive
- The **streaming executor is polled after every event** — any tools that have already finished are yielded immediately, so tool results appear in the UI before the model finishes generating

## Withheld errors

Certain recoverable errors are swallowed during the stream rather than thrown. The stream is not interrupted — chunks keep arriving. The error is buffered internally, and recovery only triggers after `message_stop`.

The reason: recovery paths (compact, escalation, strip-retry) need the full message to be assembled before they can act. Throwing mid-stream would discard partial output unnecessarily.

There are two **independent** withhold systems — either one firing is sufficient:

| Error type | System | Recovery |
|------------|--------|----------|
| Prompt too long (413) | Context collapse | Drain staged collapses → compact |
| Prompt too long (413) | Reactive compact | Compact → retry |
| Max output tokens | (shared) | Escalate to 64K → multi-turn resume |
| Media size error | Reactive compact | Strip media → compact → retry |

## Fallback model

On high API demand, the API client fires an `onStreamingFallback` callback and the response switches to a fallback model mid-stream.

When this happens, accumulated messages from the primary attempt are **tombstoned** (yielded as `tombstone` events so the UI retracts them). The reason tombstoning is required: partial messages — especially thinking blocks — carry invalid signatures that would cause "thinking blocks cannot be modified" API errors if re-sent. The streaming executor is also discarded and replaced to prevent orphan `tool_result` blocks with stale IDs.

After the reset, the loop retries against the fallback model and the caller sees a seamless response.
