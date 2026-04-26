# Agent SDK Types

Reference: [src/entrypoints/agentSdkTypes.ts](../../src/entrypoints/agentSdkTypes.ts)

## Overview

This is the **main public entrypoint for the Claude Code Agent SDK**. It re-exports all public types from three internal modules and defines the core SDK functions. SDK consumers import from this file.

## Type Re-exports

- **`sdk/coreTypes.ts`** — common serializable types (messages, configs) — generated from the Zod schemas in `coreSchemas.ts`
- **`sdk/runtimeTypes.ts`** — non-serializable types (callbacks, interfaces with methods)
- **`sdk/controlTypes.ts`** — control protocol types for SDK builders (marked `@alpha`)
- **`sdk/settingsTypes.generated.ts`** — `Settings` type generated from JSON schema
- **`sdk/toolTypes.ts`** — tool types (all marked `@internal` until SDK API stabilizes)

## Core SDK Functions

### `query()`
The primary function for running a prompt through Claude Code. Accepts a string or an async iterable of `SDKUserMessage`, plus options. Returns a `Query` object (async iterable of SDK messages).

### `tool()`
Defines a custom tool with name, description, input schema (Zod), and a handler function. Returns an `SdkMcpToolDefinition` that can be passed to `createSdkMcpServer`.

### `createSdkMcpServer()`
Creates an in-process MCP server for custom tools that run in the same process as the SDK. Note: if MCP calls run longer than 60s, override `CLAUDE_CODE_STREAM_CLOSE_TIMEOUT`.

## V2 API (Unstable, `@alpha`)

Session-based API for multi-turn conversations:
- **`unstable_v2_createSession()`** — create a persistent session
- **`unstable_v2_resumeSession()`** — resume an existing session by ID
- **`unstable_v2_prompt()`** — one-shot convenience for single prompts

## Session Management Functions

- **`getSessionMessages()`** — read a session's conversation from its JSONL transcript file
- **`listSessions()`** — list sessions with metadata, optionally filtered by project directory; supports pagination
- **`getSessionInfo()`** — read metadata for a single session by ID
- **`renameSession()`** — rename a session
- **`tagSession()`** — tag a session (or pass null to clear)
- **`forkSession()`** — fork a session into a new branch with fresh UUIDs; supports branching from a specific point via `upToMessageId`

## Internal / Daemon Primitives

These are marked `@internal` and intended for daemon architectures:

### Scheduled Tasks
- **`CronTask`** — a scheduled task from `.claude/scheduled_tasks.json`
- **`watchScheduledTasks()`** — watches the tasks file and yields `fire` / `missed` events as cron schedules are met. Acquires a per-directory lock to prevent double-firing. One-shot tasks auto-delete; recurring tasks reschedule or age out.
- **`buildMissedTaskNotification()`** — formats missed tasks into a prompt for user confirmation

### Remote Control (Cloud Execution)
- **`connectRemoteControl()`** — holds a claude.ai remote-control bridge WebSocket from a daemon process. The daemon owns the WS in the parent process — if the agent subprocess crashes, the daemon respawns it while claude.ai keeps the same session.
- **`RemoteControlHandle`** — the returned handle for reading inbound prompts, writing SDK messages, and managing control requests (interrupt, set_model, etc.)
