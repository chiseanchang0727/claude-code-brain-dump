# Session Memory

**File:** `src/services/SessionMemory/sessionMemory.ts`

A separate system from long-term memory. Session memory is a single markdown file tracking the *current conversation* — what's being worked on, which files matter, what went wrong. Its primary purpose is continuity across compaction.

**File location:** `~/.claude/session-memory/<session-id>.md`

## The problem it solves

When the context window fills and compaction runs, the conversation history is replaced with a summary. Without session memory, the model loses its working state — file paths, error history, current task. Session memory is the solution: a living document updated throughout the conversation and injected back after compaction as a context anchor.

## Trigger conditions

After every model response, three gates are checked (all must pass):

| Gate | Threshold |
|---|---|
| Init threshold | 10,000 tokens in context |
| Token growth | 5,000 tokens since last extraction |
| Tool calls | 3 tool calls since last extraction — or a natural break (0 tool calls this turn) |

## Extraction

Runs as a sequential wrapper (one at a time, queued). A forked agent is given only one allowed action: `FileEdit` on the exact session memory file path. Nothing else.

## File structure

Fixed sections (from `prompts.ts`):

```
# Session Title
# Current State       ← most critical
# Task specification
# Files and Functions
# Workflow
# Errors & Corrections
# Codebase and System Documentation
# Learnings
# Key results
# Worklog
```

Total file capped at 12,000 tokens. Users can override the template at `~/.claude/session-memory/config/template.md`.

## How it feeds compaction

When autocompact triggers, it tries session-memory-based compaction first. It waits up to 15 seconds for any in-progress extraction to finish, then reads the session memory file and injects it as a context anchor before pruning old messages. If the file is still at the default template (nothing extracted yet), it falls back to legacy compaction.
