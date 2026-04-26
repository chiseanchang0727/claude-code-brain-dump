# Execution Flow & State Machine

Reference: [src/query.ts](../../src/query.ts)

## Design Pattern: State Machine via `state + continue`

The `queryLoop` function is a state machine disguised as a `while(true)` loop. There's no explicit state machine class — the loop itself is the machine.

**How it works:**

Each iteration reads the current `state`, does work (API call, tool execution, error checks), then hits a decision point. At each decision point, either:
- **Transition:** update `state` with new values and `continue` (jump back to the top of the loop for another iteration)
- **Terminal:** `return` with a reason (exit the loop)

Each transition changes `state` and records a `transition.reason` explaining *why* we're continuing. On the next iteration, the code checks this reason to avoid repeating failed recovery strategies.

**Conceptual example:**

```
while (true) {
  read current state

  do work: call API, run tools, check errors...

  DECISION POINT: what happens next?

  if prompt_too_long AND can_collapse:
    state = { messages: collapsed, transition: 'collapse_drain_retry' }
    continue → go back to top, retry API with collapsed messages

  if prompt_too_long AND can_compact:
    state = { messages: compacted, transition: 'reactive_compact_retry' }
    continue → go back to top, retry API with compacted messages

  if output_too_long AND can_escalate:
    state = { maxOutputTokens: 64K, transition: 'max_output_tokens_escalate' }
    continue → go back to top, retry same request with higher limit

  if tools_called:
    state = { messages: [...old, ...toolResults], transition: 'next_turn' }
    continue → go back to top, normal next turn

  return 'completed' → exit the loop
```

**Why `transition.reason` matters:**

The previous transition influences the next iteration's decisions. For example:
- "If we already tried collapse drain last time and still got 413, don't try it again — fall through to reactive compact instead"
- "If we already attempted reactive compact, don't spiral — surface the error"

**7 transition reasons:**
- `next_turn` — normal: model called tools, continue with results
- `collapse_drain_retry` — drained staged context collapses, retry API
- `reactive_compact_retry` — ran emergency compaction, retry API
- `max_output_tokens_escalate` — retry at 64K token limit
- `max_output_tokens_recovery` — inject "resume" message and continue
- `stop_hook_blocking` — stop hook found issues, model needs to fix
- `token_budget_continuation` — model hasn't used its full budget, nudge to continue

## Query Execution Flow (True Code Order)

This is the full execution flow from when `query()` accepts a prompt to when it returns a result. The flow is a `while(true)` loop — steps 1-12 can repeat multiple times (each pass = one API round-trip) before finally exiting at step 7d.

Note: recovery and tool execution are in **separate branches**, determined by `needsFollowUp` (explained after step 12).

### 1. Skill prefetch start (line 331)
Kicks off skill discovery in the background. Runs in parallel with everything below.

### 2. Pre-process messages (lines 369-468)
Before sending to the API, messages go through up to five layers of context management (in order):
1. **Tool result budget** (line 379) — enforces per-message size limits on tool results
2. **Snip compaction** (line 401) — removes low-value middle ranges (feature-gated: `HISTORY_SNIP`, internal only)
3. **Microcompact** (line 414) — collapses verbose tool results into shorter representations
4. **Context collapse** (line 441) — projects a collapsed view, committing staged collapses (feature-gated: `CONTEXT_COLLAPSE`)
5. **Autocompact** (line 454) — if still over token threshold, summarizes the prefix into a compact boundary

### 3. API call + stream (lines 658-864)
Streams the response from Claude via `deps.callModel()`:
- Collects `assistantMessages` and `toolUseBlocks` as they stream in
- **Streaming tool execution** — if enabled, tools start executing while model is still streaming
- **Withholds recoverable errors** — prompt-too-long, max-output-tokens, media-size errors are held back (not yielded)
- **Fallback model** — on high demand, switches to fallback model, tombstones orphaned messages, retries

### 4. Post-sampling hooks (line 1001)
Fires after model response completes (fire-and-forget).

### 5. Abort check — streaming (line 1015)
If user interrupted during streaming, clean up orphaned tool_use blocks and exit.

### 6. Yield previous turn's tool summary (line 1055)
The Haiku call from the previous iteration — by now it has had 5-30s to resolve.

### Branch: `!needsFollowUp` — model stopped (line 1062)
> What is `needsFollowUp` and how is it determined? See [explanation after step 12](#how-the-branch-is-determined-needsfollowup).

#### 7a. Recovery (lines 1085-1256)
Only if the last message was a withheld error:
- **Prompt too long:** try collapse drain (line 1094) → reactive compact (line 1120) → surface error
- **Max output tokens:** escalate to 64K (line 1199) → multi-turn "resume" injection (line 1223) → surface error
- **Media size:** reactive compact strip-retry (line 1119)
- Each recovery is a state machine transition (`state = next; continue`)

#### 7b. Stop hooks (line 1267)
Fires fire-and-forget background tasks (memory extraction, prompt suggestion, auto-dream) and runs user-defined stop hooks. Memory extraction and other forked agents launch here — before the loop formally exits. See [stop-hooks.md](./stop-hooks.md) for details.

#### 7c. Token budget check (line 1309)
If model hasn't used its full budget, nudge to continue.

#### 7d. Return completed (line 1357)
Exit the loop.

### Branch: `needsFollowUp` — tools needed

#### 8. Tool execution (lines 1363-1409)
- **Streaming path** (`StreamingToolExecutor`): consume remaining results from tools that started during streaming
- **Sequential path** (`runTools`): execute all tool use blocks now
- Each tool goes through `canUseTool` permission check

#### 9. Abort check — tools (line 1485)
If user interrupted during tool execution, clean up and exit.

### 10. Post-tool work (lines 1538-1628)
- **Queued commands** (line 1570) — drains pending notifications, scoped by agent ID
- **Attachments** (line 1580) — memory, context attachments fed back to the model
- **Memory prefetch consume** (line 1600) — if settled, inject relevant memories (zero-wait, retries next iteration if not ready)
- **Skill discovery consume** (line 1620) — inject prefetched skill discovery results
- **Tool use summary start** (line 1469) — fires off async Haiku call (consumed at step 6 of next iteration)

### 11. Max turns check (line 1705)
If exceeded, yield max_turns_reached and exit.

### 12. State transition (line 1727)
`state = { messages: [...old, ...assistantMessages, ...toolResults], transition: 'next_turn' }; continue`

### How the branch is determined: `needsFollowUp`

**`needsFollowUp`** (line 558) — a boolean that answers: "did the model ask to use tools?" It starts as `false` each iteration. During streaming (step 3), whenever a `tool_use` block arrives in an assistant message, it's set to `true` (line 834). After streaming finishes, the loop checks this flag:

- `needsFollowUp = true` → tools needed → tool execution path (step 8)
- `needsFollowUp = false` → model stopped → recovery/stop hooks path (step 7)

Note: the code does NOT check `stop_reason === 'tool_use'` — the comment on line 554 says it's unreliable. Instead, the presence of actual `tool_use` blocks is the signal. Simpler and more reliable.

The code checks the actual content blocks returned by the model (line 831-834):

```typescript
const msgToolUseBlocks = message.message.content.filter(
  content => content.type === 'tool_use',
) as ToolUseBlock[]
if (msgToolUseBlocks.length > 0) {
  toolUseBlocks.push(...msgToolUseBlocks)
  needsFollowUp = true
}
```

So `needsFollowUp` is set by code inspecting the response, not by trusting a metadata field from the model. It's like the difference between asking someone "did you put groceries in the bag?" (trusting `stop_reason`) vs opening the bag and checking yourself (scanning for `tool_use` blocks). They open the bag.

The two branches (`!needsFollowUp` → step 7: recovery/stop hooks, and `needsFollowUp` → steps 8-12: tool execution) never both run in the same pass.

### Iteration flow summary

Step 12 is just one of many `continue` sites. Recovery transitions in 7a also do `state = next; continue` — jumping back to step 1 much earlier. The difference is what's in `state`.

```
Normal flow:     1 → 2 → 3 → 4 → 5 → 6 → 8 → 9 → 10 → 11 → 12 → back to 1
                                              (needsFollowUp = true, skip 7)

Recovery flow:   1 → 2 → 3 → 4 → 5 → 6 → 7a → back to 1
                                              (needsFollowUp = false, error withheld,
                                               recovery succeeds, state = next; continue)

Completed flow:  1 → 2 → 3 → 4 → 5 → 6 → 7b → 7c → 7d → return (exit loop)
                                              (needsFollowUp = false, no error,
                                               stop hooks pass, budget done)
```

## State Management

Mutable state carried across iterations via a `State` object:
- `messages` — the conversation so far
- `toolUseContext` — context for tool execution (updated per-iteration)
- `autoCompactTracking` — tracks compaction state across iterations
- `maxOutputTokensRecoveryCount` — how many max-output recovery attempts so far
- `hasAttemptedReactiveCompact` — prevents infinite reactive compact loops
- `turnCount` — incremented on each iteration
- `transition` — why the previous iteration continued (for test assertions and recovery logic)

## Exit Reasons

| Reason | When |
|--------|------|
| `completed` | Model finished naturally (no more tool calls) |
| `aborted_streaming` | User interrupted during API streaming |
| `aborted_tools` | User interrupted during tool execution |
| `prompt_too_long` | Context too large, all recovery failed |
| `blocking_limit` | At hard blocking token limit (autocompact off) |
| `image_error` | Media size issues |
| `model_error` | API/runtime error |
| `hook_stopped` | Hook blocked continuation during tool execution |
| `stop_hook_prevented` | Stop hook prevented continuation after model response |
