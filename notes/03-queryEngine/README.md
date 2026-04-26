# Query Engine

Reference: [src/QueryEngine.ts](../../src/QueryEngine.ts)

## Overview

The QueryEngine is the heart of Claude Code. One instance per conversation. Each `submitMessage()` call is one turn within that conversation. State (messages, file cache, usage) persists across turns.

## High-Level Flow

### 1. Setup
- Resolves the model and thinking config (defaults to `adaptive` if supported)
- Composes the system prompt from: custom prompt + memory mechanics + append prompt
- Loads coordinator context if in coordinator mode (feature-gated)
- Loads skills and plugins (cache-only, no network blocking)
- Yields a `system_init` message with available tools, models, agents, skills

### 2. Process User Input
- Parses the prompt, handles `/slash` commands
- Determines if an API call is needed (`shouldQuery`)
- If not (e.g., a local command like `/help`), yields the command output and a success result, then returns early

### 3. Persist User Message
- Writes the user message to the JSONL transcript **before** the API call
- This ensures the session is resumable even if the process is killed before the API responds
- In bare/scripted mode, this is fire-and-forget for speed

### 4. Query Loop
Calls `query()` (from `src/query.ts`) which runs the actual API call and tool execution loop. QueryEngine consumes the async stream and for each message:
- **Assistant messages** — pushes to history, records transcript (fire-and-forget), yields normalized SDK messages
- **User messages** (tool results injected by the loop) — increments turn count
- **Stream events** — tracks token usage per message (`message_start`, `message_delta`, `message_stop`), captures `stop_reason`
- **Progress/attachment** — records inline to transcript; handles structured output capture and max-turns-reached signals
- **System messages** — handles context compaction (snip boundaries), releases pre-compaction messages for GC, yields API retry info on errors
- **Budget checks** — after each message, checks max USD budget, max turns, and structured output retry limits; yields an error result and returns if exceeded

### 5. Result
After the loop ends:
- Determines success/failure via `isResultSuccessful()` (checks last message type and stop reason)
- Extracts the text result from the last assistant message
- Flushes transcript writes (desktop app kills the process immediately after receiving result)
- Yields a final `result` message containing: cost, usage, duration, stop reason, permission denials, structured output, errors

## Key Properties
- `mutableMessages` — the conversation history, mutated in place across turns
- `totalUsage` — accumulated token usage across all turns
- `permissionDenials` — tracked via a wrapped `canUseTool` function
- `readFileState` — file state cache for tracking file reads

## Control Methods
- `interrupt()` — aborts the current turn via AbortController
- `getMessages()` — returns the conversation history
- `getReadFileState()` — returns the file state cache
- `setModel()` — changes the model for subsequent turns
