# Session Memory

Reference: [`src/services/SessionMemory/sessionMemory.ts`](../../src/services/SessionMemory/sessionMemory.ts), [`src/services/SessionMemory/sessionMemoryUtils.ts`](../../src/services/SessionMemory/sessionMemoryUtils.ts), [`src/services/SessionMemory/prompts.ts`](../../src/services/SessionMemory/prompts.ts), [`src/services/compact/sessionMemoryCompact.ts`](../../src/services/compact/sessionMemoryCompact.ts)

## What It Is

Session memory is a single markdown file that tracks the current conversation — what's being worked on, what files matter, what commands are used, what went wrong. It's separate from the long-term memory system (`~/.claude/projects/*/memory/`): session memory is per-session and focused on continuity within one conversation, especially across compaction.

File location: `~/.claude/session-memory/<session-id>.md` (via `getSessionMemoryPath()`)

## The Problem It Solves

When the context window fills up and compaction runs, the conversation history is replaced with a summary. Without session memory, the model loses its working memory — file paths, error history, current task state. Session memory is the solution: a living document that's updated throughout the conversation and injected back after compaction.

## How It Works

### 1. Initialization (`initSessionMemory` — line 357)

Called at session start. Registers a `postSamplingHook` — a callback that fires after every model response. Only registers if auto-compact is enabled (session memory feeds the compact path). Skipped in remote mode.

### 2. Trigger Condition (`shouldExtractMemory` — line 134)

After each model response the hook checks whether to run an extraction. Three gates, all must pass:

| Gate | Threshold | Why |
|---|---|---|
| **Init threshold** | 10,000 tokens in context | Don't bother until the conversation has enough content |
| **Token growth** | 5,000 tokens since last extraction | Don't run too frequently — wait for meaningful new content |
| **Tool calls** | 3 tool calls since last extraction | Or: no tool calls in last turn (natural break) |

Token threshold always required — even if tool-call count is met, extraction waits for enough new tokens. Prevents excessive extractions on a busy but short conversation.

### 3. Extraction (lines 272–350)

Runs as a `sequential` wrapper — only one extraction at a time, queued not concurrent.

```
shouldExtractMemory() → true
      ↓
setupSessionMemoryFile()        ← create file if new, read current content
      ↓
buildSessionMemoryUpdatePrompt()  ← inject current notes + instructions
      ↓
runForkedAgent()                 ← background agent edits the file
  canUseTool: only FileEdit on the exact memory path (line 460)
```

The forked agent's only allowed action is `FileEdit` on the session memory file — nothing else. `createMemoryFileCanUseTool` (line 460) enforces this, denying everything else.

### 4. The Memory File Structure

Default template (`prompts.ts` line 11) has fixed sections:

```markdown
# Session Title
# Current State       ← most critical: what's happening right now
# Task specification
# Files and Functions
# Workflow
# Errors & Corrections
# Codebase and System Documentation
# Learnings
# Key results
# Worklog
```

The agent is instructed to preserve section headers and italic description lines exactly — only the content below them changes. Sections have a ~2,000 token limit each; total file capped at 12,000 tokens (`prompts.ts` line 9).

Users can override the template at `~/.claude/session-memory/config/template.md` and the update prompt at `~/.claude/session-memory/config/prompt.md`.

### 5. How It Feeds Back In (Compaction)

Session memory's primary consumer is the compaction path (`sessionMemoryCompact.ts`). When the context window fills:

```
autoCompact triggers
      ↓
trySessionMemoryCompaction()    ← tries SM-based compact first (line 288, autoCompact.ts)
      ↓
waitForSessionMemoryExtraction()  ← waits up to 15s for in-progress extraction
      ↓
reads session memory file
      ↓
prunes old messages, injects session memory as context anchor
      ↓
conversation continues with session memory as its "memory" of what happened
```

If session memory is empty (file still matches the default template), SM-based compaction is skipped and the legacy compaction path runs instead.

## Key Details

**`sequential` wrapper (line 272):** Extractions are queued, not dropped. If a second extraction triggers while one is running, it waits rather than being skipped. This prevents two agents racing to edit the same file.

**`waitForSessionMemoryExtraction` (sessionMemoryUtils.ts line 89):** Compaction waits up to 15 seconds for an in-progress extraction to finish. If the extraction is stale (>1 minute old), it gives up and proceeds anyway — stale lock guard.

**Isolated context (line 303):** `createSubagentContext` is called before reading the file, so the file read doesn't pollute the parent's `readFileState` cache. The forked agent then receives that isolated `readFileState` — so its view of the file is fresh.

**`lastSummarizedMessageId`:** Tracks the UUID of the last message that was included in an extraction. After compaction, this is reset to `undefined` since the old UUIDs no longer exist in the pruned message list.
