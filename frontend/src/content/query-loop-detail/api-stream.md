# API Call + Stream

**File:** `src/query.ts:658–864` — `queryModelWithStreaming()`

Sends the current messages to the Claude API and streams the response back.

## What happens during streaming

- Collects `assistantMessages` and `toolUseBlocks` as they arrive chunk by chunk
- Yields stream events to the caller in real time (so the UI can display partial responses)
- If streaming tool execution is enabled, **tools begin executing before the model finishes responding** — parallelizing model output and tool work

## Withheld errors

Certain errors are **not thrown immediately** — they are held back and processed after streaming completes:

| Error type | Recovery attempted |
|------------|-------------------|
| Prompt too long (413) | Context collapse → reactive compact |
| Max output tokens | Escalate to 64K → multi-turn resume |
| Media size error | Strip-retry compact |

## Fallback model

On high API demand, the response may arrive from a fallback model. When this happens:

1. Orphaned messages from the primary model are tombstoned (retracted)
2. The request is retried against the fallback model
3. The caller sees a seamless response
