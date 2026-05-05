# Compaction Deep Dive

Reference: [`src/services/compact/compact.ts`](../../src/services/compact/compact.ts), [`src/services/compact/autoCompact.ts`](../../src/services/compact/autoCompact.ts), [`src/services/compact/sessionMemoryCompact.ts`](../../src/services/compact/sessionMemoryCompact.ts)

Related: [compaction-strategies.md](./compaction-strategies.md) — the four strategies and when each fires

## Two Compaction Paths

When autocompact triggers, it tries two paths in order (`autoCompact.ts` line 288):

```
autoCompact triggers
      ↓
trySessionMemoryCompaction()   ← no API call, uses session memory file as summary
      ↓ (if null — no session memory or feature flag off)
compactConversation()          ← API call, model generates a summary
```

---

## Path 1: Session Memory Compaction (`sessionMemoryCompact.ts:514`)

**Condition:** session memory feature flag `tengu_session_memory` on AND session memory file exists AND file has real content (not just the blank template).

**What happens:**
1. `waitForSessionMemoryExtraction()` — waits up to 15s for any in-progress extraction to finish
2. Reads the session memory file content
3. Truncates oversized sections (per-section cap ~2,000 tokens, total cap 12,000 tokens)
4. Wraps in `getCompactUserSummaryMessage()` — produces the standard "This session is being continued..." prefix
5. Prunes all messages before `lastSummarizedMessageId` — keeps only the recent tail
6. Returns a `CompactionResult` with no API call needed

**Why it's preferred:** no API call = no cost, no latency, no risk of failure. The session memory file was built incrementally throughout the conversation, so the summary is already there.

---

## Path 2: Traditional Compaction (`compact.ts:387`)

Used when session memory isn't available. Runs a forked agent to generate a summary.

### Step-by-step flow

**1. Pre-compact hooks (line 413)**
User-defined hooks fire before compaction. Can inject custom instructions that get merged into the compact prompt.

**2. Build compact prompt (line 440)**
`getCompactPrompt(customInstructions)` produces a structured prompt asking the model to summarize: current task, key decisions, files changed, errors, what was learned, current state.

**3. `streamCompactSummary()` — the API call (line 451)**
Runs `runForkedAgent` with the full conversation as context + compact prompt appended. The fork inherits the parent's prompt cache — so the expensive "read the whole conversation" step is nearly free (cache hit).

**Prompt-too-long retry loop (lines 450–491):** If the compaction request itself hits the context limit (`PROMPT_TOO_LONG_ERROR_MESSAGE`), `truncateHeadForPTLRetry` removes the oldest message groups and retries — up to `MAX_PTL_RETRIES`. Circuit breaker: after 3 failures throws `ERROR_MESSAGE_PROMPT_TOO_LONG`.

**4. Post-compact context rebuild (lines 517–585)**

After the summary is generated, the conversation is rebuilt from scratch:

| What | Why |
|---|---|
| `readFileState.clear()` (line 521) | File cache is stale — files may have changed during the compacted session |
| `loadedNestedMemoryPaths?.clear()` (line 522) | Force re-scan of memory files |
| `createPostCompactFileAttachments()` (line 533) | Re-inject up to 5 recently-read files so the model doesn't lose file context (capped at 50k tokens total, 5k per file) |
| `getDeferredToolsDeltaAttachment()` (line 567) | Re-announce deferred tool schemas — summary doesn't preserve `tool_reference` blocks |
| `getAgentListingDeltaAttachment()` (line 575) | Re-announce available agents |
| `getMcpInstructionsDeltaAttachment()` (line 578) | Re-announce MCP server instructions |
| `processSessionStartHooks()` (line 592) | SessionStart hooks fire again — compaction is treated as a new session start |

**5. Build `CompactionResult` (lines 598–640)**

```
CompactionResult = {
  boundaryMarker          ← SystemMessage marking the compaction point
  summaryMessages         ← ["This session is being continued... <summary>"]
  attachments             ← re-injected files, tool schemas, agent listings
  hookResults             ← SessionStart hook output
  messagesToKeep          ← recent messages preserved verbatim (partial compact)
}
```

The final message array after compaction (`buildPostCompactMessages`, line 330):

```
[boundaryMarker, ...summaryMessages, ...messagesToKeep, ...attachments, ...hookResults]
```

---

## The Compact Boundary Marker

`createCompactBoundaryMessage()` produces a `SystemCompactBoundaryMessage` that sits at the boundary point in the message list. It records:
- `auto` vs `manual` trigger
- pre-compact token count
- UUID of the last pre-compact message
- deferred tool names discovered pre-compact (so post-compact API calls keep sending those schemas)

The boundary marker is how the query loop knows where compaction happened — `getMessagesAfterCompactBoundary()` finds it to reconstruct the right view.

---

## Token Thresholds

All defined in `autoCompact.ts`:

| Constant | Value | Purpose |
|---|---|---|
| `AUTOCOMPACT_BUFFER_TOKENS` | 13,000 | Trigger buffer below context window |
| `WARNING_THRESHOLD_BUFFER_TOKENS` | 20,000 | UI warning (yellow) |
| `ERROR_THRESHOLD_BUFFER_TOKENS` | 20,000 | UI error (red) |
| `MANUAL_COMPACT_BUFFER_TOKENS` | 3,000 | Blocking limit for manual /compact |
| `MAX_OUTPUT_TOKENS_FOR_SUMMARY` | 20,000 | Reserved for compact summary output (p99.99 was 17,387 tokens) |

Effective threshold: `contextWindow - reservedOutputTokens - 13,000`

---

## Circuit Breaker

After 3 consecutive autocompact failures (`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`, line 70), the system stops retrying. Without this, a session with an irrecoverably oversized context would burn API calls on every turn. BQ data showed 1,279 sessions with 50+ consecutive failures (up to 3,272), wasting ~250k API calls/day.
