# Session Storage & UUID Parent Chain

Reference: [src/utils/sessionStorage.ts](../../src/utils/sessionStorage.ts)

## Overview

`sessionStorage.ts` is the persistence layer for conversations. It writes to append-only JSONL transcript files and is called throughout the query lifecycle — not a single step, but a utility used at multiple points (after user input, during the query loop, before yielding results).

## recordTranscript()

The core write function. It's **append-only and incremental**:

1. Cleans messages for logging
2. Deduplicates — checks which messages are already recorded by UUID
3. Writes only new messages via `insertMessageChain()`
4. Returns the UUID of the last recorded message for chain continuity

## UUID Parent Chain

Every message has a `uuid` and a `parentUuid` pointing to the previous message, forming a linked list. This is the backbone that enables:

- **Branching** — fork/resume/rewind create multiple branches in the same file. The parent chain lets you walk back from any point to reconstruct just that branch.
- **Append-only safety** — the JSONL is never rewritten. Old/rewound messages stay in the file. The parent chain distinguishes the current branch from abandoned ones.
- **Parallel execution** — subagents, background tasks, and tool results can write concurrently. Each one's messages chain independently via parent UUIDs.
- **Resume** — `--resume` calls `buildConversationChain()` which walks parent UUIDs to reconstruct the conversation, like following git commits.

Think of it like a git DAG — a flat object store with pointer-based history that enables branching, merging, and parallel work.

## Token Usage Recording in Messages

Each assistant message in the transcript stores the token usage stats returned by the API for that specific call:

```
msg4 (assistant):
  content: "Here's how to fix the bug..."
  usage:
    input_tokens: 190,000                  ← how many tokens were in the prompt sent to the API
    output_tokens: 500                     ← how many tokens the model generated
    cache_creation_input_tokens: 50,000    ← tokens written to cache
    cache_read_input_tokens: 80,000        ← tokens read from cache
```

These are **local bookkeeping numbers** — the API usage stats that came back with each response. They are not modifiable on the API/billing side. They're used locally to:
- Decide when to trigger compaction (is the context getting too big?)
- Show cost/usage stats to the user

## Compaction & the Preserved Segment

When context gets too long, compaction summarizes old messages. The mechanism:

### What happens

```
Before:  msg1 → msg2 → msg3 → msg4 → msg5 → msg6

After:   [compact_boundary (summary of msg1-msg3)] → msg4 → msg5 → msg6
```

Old messages (msg1-msg3) stay in the JSONL file on disk but are **pruned from memory**. There is **no link back** to the compacted messages — the summary in the compact boundary is all that remains in the active chain.

### preservedSegment metadata

The compact boundary message contains `compactMetadata.preservedSegment` with three UUIDs:

- **`anchorUuid`** — the compact boundary message itself (the attachment point)
- **`headUuid`** — the first preserved message (msg4)
- **`tailUuid`** — the last preserved message at the time of compaction (msg6)

### What applyPreservedSegmentRelinks() does on transcript load

Runs inside `loadTranscriptFile()` whenever a session is loaded from disk — most commonly triggered by `--resume` / `/resume`, but applies to any transcript read:

1. **Walk tail → head** to identify which messages are in the preserved segment
2. **Relink head to anchor** — msg4's `parentUuid` originally pointed to msg3 (now pruned), so it's rewritten to point to the compact boundary instead. This connects the preserved segment to the new chain.
3. **Zero out token usage** — preserved messages still carry their original usage stats from when the full context was in the window. For example, msg4 might say `input_tokens: 190,000` because when it was originally sent, the entire conversation (msg1-msg4) was in the prompt. After compaction, the actual context is much smaller (just the summary + preserved messages), but the recorded number still says 190K. If left as-is, the system reads these on resume and thinks "context is near the limit" → triggers compaction again → infinite loop. Zeroing the four usage fields (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) to 0 prevents this spiral. Only the usage counters are zeroed — message content stays intact.

### tailUuid after new messages arrive

The tail is a **one-time reconstruction hint**, not an ongoing boundary. After compaction, new messages (msg7, msg8...) chain normally off the tail via regular `parentUuid` links. The tail UUID is only needed during resume to identify the preserved segment.

```
[compact_boundary] → msg4(head) → msg5 → msg6(tail) → msg7 → msg8
                                                         ↑
                                                   normal parentUuid chain,
                                                   tail has no special role here
```

## Sidechain Transcripts

Subagents (spawned via the Agent tool) don't write to the main conversation transcript. They write to **separate sidechain files** via `recordSidechainTranscript()`.

### Why sidechains are separate

Each message has an `isSidechain: boolean` flag. Sidechain messages are written to a separate agent-specific file (`getAgentTranscriptPath(agentId)`) rather than the main session JSONL. This separation is critical:

- **UUID isolation** — sidechain UUIDs are NOT added to the main session's `messageSet`. If they were, `recordTranscript()` would see them as "already recorded" and skip them on the main thread, leaving the main chain with a dangling `parentUuid` reference. This broke `--resume` (the chain walk terminates at the missing UUID).
- **Dedup bypass** — normally, `recordTranscript()` loads the set of all UUIDs already in the main session file and skips any message whose UUID is already present. Sidechain writes skip this check entirely. Why: a forked subagent inherits copies of the parent's messages with the **same UUIDs**. Those UUIDs are already in the main session's set. If the sidechain used the same dedup check, every inherited message would be seen as "already recorded" and skipped — leaving the sidechain file missing all inherited context, with only the subagent's new messages.
  - Dedup check: for each message, look up its UUID in the session's `messageSet` (all UUIDs already written to the JSONL). If found → skip. If not → write and add the UUID to the set. This is how `recordTranscript()` stays incremental — it can be called many times with the full message array and only writes what's new.
- **Remote persistence caveat** — the local sidechain bypass does NOT apply to remote persistence (session-ingress), which uses a single UUID chain per session. Re-posting a UUID that already exists causes 409 errors.

### How sidechains are used

- **Writing** — `recordSidechainTranscript(messages, agentId, startingParentUuid)` writes to the agent's own file
- **Reading** — `getAgentTranscript(agentId)` loads a sidechain by filtering for `isSidechain && agentId` match
- **Session listing** — sidechain sessions are filtered OUT of `/resume` and session listings (`isSidechain` sessions are skipped during `enrichLogs`)
- **Resume** — main session resumes from the last non-sidechain message (`findLatestMessage` filters `!m.isSidechain`)

### Context inheritance — two types of subagent (`AgentTool.tsx:630`, `runAgent.ts:370`)

The key branch in `AgentTool.tsx`:
```ts
forkContextMessages: isForkPath ? toolUseContext.messages : undefined
```

This single flag determines which of two types the subagent is:

| Type | `forkContextMessages` | Gets parent history? | Example |
|------|-----------------------|----------------------|---------|
| **Fork** | `toolUseContext.messages` | Yes — full parent history | coordinator workers |
| **Fresh agent** | `undefined` | No — starts blank | Explore, Plan, AgentTool with `subagent_type` |

**What a fork receives** (`runAgent.ts:370`):
```ts
contextMessages = filterIncompleteToolCalls(forkContextMessages)  // full parent history, minus incomplete tool calls
initialMessages = [...contextMessages, ...promptMessages]          // parent history + new task prompt
agentReadFileState = cloneFileStateCache(toolUseContext.readFileState)  // cloned file cache
```

**What a fresh agent receives:**
```ts
contextMessages = []                  // nothing from parent
initialMessages = promptMessages      // just the task prompt
agentReadFileState = fresh empty cache
```

It is all-or-nothing — there is no selective "pick these messages" logic. This is why the dedup bypass matters — fork-path subagents carry the full parent history with original UUIDs, and those must all be written to the sidechain file.

## Three-Layer Compaction Strategy

Every turn, before the API call, `query.ts` runs three compaction layers in order. Each layer's check runs every turn, but only acts when its criteria are met.

### 1. Snip Compaction (feature-gated: `HISTORY_SNIP`, internal only)

Removes **middle ranges** of low-value messages from the conversation — unlike regular compaction which only truncates the prefix.

```
Before:  msg1 → msg2 → msg3 → msg4 → msg5 → msg6
Snip msg3-msg4:
After:   msg1 → msg2 → msg5 → msg6
                  ↑
            msg5.parentUuid relinked from msg4 to msg2
```

- `snipCompactIfNeeded(messages)` checks if snip is needed and returns `{ messages, tokensFreed, boundaryMessage }`
- Records `removedUuids` in the boundary's `snipMetadata` so `applySnipRemovals()` can replay the exact removal on resume
- Uses path compression when relinking — once a gap's resolution is found, it's cached for other survivors in the same gap
- `tokensFreed` is passed to autocompact so the threshold check accounts for what snip already freed
- **Known gap:** the actual logic for determining what counts as "low-value middle sections" is not in this repo — `snipCompact.ts` is internal-only source, excluded from external builds via compile-time dead-code elimination (`feature('HISTORY_SNIP')` returns false → entire module removed from bundle)

### 2. Microcompact

Collapses verbose tool results (e.g., large file reads, search outputs) into shorter representations. Runs after snip.

### 3. Autocompact

Checks if total token count exceeds a threshold for the model's context window. If so, triggers a full prefix compaction — summarizes everything before a cut point into a compact boundary message. This is the regular compaction described in the earlier section.

The three layers are **not mutually exclusive** — snip and microcompact can both fire, and autocompact may still be needed after both.

## buildConversationChain() — Reading the Chain Back

The read counterpart to `recordTranscript()`. Used by `/resume` to reconstruct a conversation from the flat JSONL file.

**Simple case:** walks backwards from the leaf message following `parentUuid` links, then reverses. A linked list traversal.

**Parallel tools complication:** when the model emits multiple `tool_use` blocks in one response, streaming splits them into separate assistant messages (one per tool_use block). They share the same `message.id` but have different `uuid`s. Each tool result's `parentUuid` points to its own assistant message:

```
                  ┌→ assistantA (Read file1) → toolResult_A
assistant_prev →  ├→ assistantB (Read file2) → toolResult_B  → next_assistant
                  └→ assistantC (Grep)       → toolResult_C
```

The chain walk follows one path (e.g., through assistantA) and **misses** the siblings. `recoverOrphanedParallelToolResults()` fixes this by finding sibling assistant messages (same `message.id`) and stitching the missed branches back into the chain.

This only matters for `/resume` — during live execution, all messages are already in memory.

## Not Yet Covered (TODO)

- **File history snapshots** — `recordFileHistorySnapshot()` saves file states at each user message, enabling rewind/undo of file changes.
- **Session metadata** — titles, tags, agent names/colors, worktree state, PR links appended as metadata entries. Functions: `saveCustomTitle()`, `saveTag()`, `linkSessionToPR()`, `saveAgentName()`, etc.
- **Session listing/search** — `fetchLogs()`, `loadMessageLogs()`, `searchSessionsByCustomTitle()` — querying across sessions for the resume picker.
- **Content replacement** — `recordContentReplacement()` — replaces message content after the fact (e.g., permission decisions that modify tool results).
- Transcript size limit: `MAX_TRANSCRIPT_READ_BYTES = 50 * 1024 * 1024`