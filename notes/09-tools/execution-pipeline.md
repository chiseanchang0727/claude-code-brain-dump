# Tool Execution Pipeline

Reference: [`src/services/tools/toolOrchestration.ts`](../../src/services/tools/toolOrchestration.ts), [`src/services/tools/StreamingToolExecutor.ts`](../../src/services/tools/StreamingToolExecutor.ts), [`src/services/tools/toolExecution.ts`](../../src/services/tools/toolExecution.ts)

## Big Picture

When the model responds with tool calls, the query loop needs to execute them and feed the results back before the next turn. The pipeline has three layers:

```
query.ts (sees tool_use blocks in model response)
      ↓
StreamingToolExecutor or runTools()   ← concurrency + ordering
      ↓
runToolUse()  ← per-tool: permissions, call(), result serialization
```

## Two Execution Modes

### Streaming mode — `StreamingToolExecutor`

The model streams its response token by token. When a complete `tool_use` block arrives inside that stream, `query.ts` immediately calls `streamingToolExecutor.addTool(toolBlock, message)` — the tool starts executing right there, while the model is still generating the rest of its response.

```
Model streaming:  [thinking...] [tool_use: Read file.ts] [tool_use: Read utils.ts] [done]
                                       ↓ addTool()              ↓ addTool()
Tool execution:                  Read starts here        Read starts here
                                       ↓
query.ts loop:   getCompletedResults() called after each streamed message → yields any ready results
```

After the stream ends, `getRemainingResults()` waits for any tools still running, yielding progress messages as they arrive via `Promise.race([...executingPromises, progressPromise])` — so the UI stays live even if tools are slow.

**Why this matters:** without streaming execution, the pipeline would be: wait for full model response → then run all tools → then send next request. With it: tools run in parallel with the model's generation, cutting latency for common cases like reading multiple files.

### Batch mode — `runTools()` (`toolOrchestration.ts`)

Used after full response is received. Takes all `tool_use` blocks at once and runs them in batches.

## Concurrency Model

Both modes use the same concurrency rules, driven by `isConcurrencySafe(input)`:

**`partitionToolCalls()`** groups the tool list into batches:
- Consecutive concurrent-safe tools → one batch, run in parallel (up to `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`, default 10)
- Any non-concurrent tool → its own batch of 1, runs alone

Example: `[Read, Read, Bash, Read, Read]` → `[{Read, Read}, {Bash}, {Read, Read}]`

**Why non-concurrent tools run alone:** they may modify shared state (files, environment) that other tools depend on. Giving them exclusive access avoids race conditions.

**Context modifiers** — some tools return a `contextModifier` that updates `ToolUseContext` after they run (e.g. updating permissions, adding working directories). These are only applied for non-concurrent tools. Concurrent tools can't safely modify shared context mid-batch, so their modifiers are queued and applied after the whole batch finishes.

## Sibling Abort `#resilience`

When tools run in parallel and one fails, what happens to the others?

Only **Bash tool errors** cascade — `siblingAbortController.abort('sibling_error')` fires, cancelling all sibling subprocesses immediately. The rationale: Bash commands often have implicit dependency chains (`mkdir` fails → subsequent commands are pointless). Aborting siblings fast avoids wasted work.

Other tool failures (Read, WebFetch, etc.) don't cancel siblings — they are independent by nature.

The erroring tool itself gets its real error result. Siblings that get cancelled receive a synthetic error: `"Cancelled: parallel tool call X errored"`.

## Interrupt Behavior `#resilience`

When the user types a new message while tools are running, `interruptBehavior()` decides per-tool:

- `'cancel'` — stop immediately, produce a rejection result
- `'block'` — keep running; the new message waits (default)

The `siblingAbortController` is a child of the main `abortController`. Aborting it does **not** abort the parent — so query.ts doesn't end the turn when a sibling error fires. Only a full user abort (ESC) ends the turn.

## Per-Tool Execution (`runToolUse` → `checkPermissionsAndCallTool`)

Each tool call goes through a strict sequential pipeline:

**1. Tool lookup**
Find the tool by name in the active tool list. Falls back to deprecated aliases (e.g. old transcripts calling `"KillShell"` which is now aliased to `"TaskStop"`). If not found, returns an error result immediately — no exception thrown.

**2. Abort check**
If the abort controller is already fired (user interrupted, sibling error), skip everything and return a cancellation result.

**3. Zod input validation** `#resilience`
Parse the raw input from the model through the tool's `inputSchema`. The authors note directly: *"the model is not great at generating valid input"* — type mistakes genuinely happen (e.g. sending a string where an array is expected).

When validation fails, the error is returned to the model tagged with a specific prefix:

```
<tool_use_error>InputValidationError: expected array, got string</tool_use_error>
```

The `InputValidationError` prefix is the signal — the model reads it and knows to retry with corrected input on the next turn, rather than trying a different approach. The fix happens through the normal tool result feedback loop, not through prevention.

If a deferred tool fails here because its schema was never sent to the API, a hint is appended: `"Load the tool first via ToolSearch, then retry"`.

**4. `validateInput()` — semantic validation**
Tool-specific logic beyond types. Example: `FileEditTool` checks the file actually exists and `old_string` is present in it before asking for permission.

**5. Speculative classifier (Bash only)**
For Bash tools, `startSpeculativeClassifierCheck()` fires immediately — it starts the auto-mode security classifier in parallel with the upcoming permission check, so the result is ready by the time it's needed.

**6. `backfillObservableInput()` — observable input clone** `#api-boundary`
The model sends raw input like `file_path: "~/foo.ts"`. Before hooks and permissions run, the code creates a shallow clone and expands/enriches fields on it — so hooks and `canUseTool` see `file_path: "/home/sean/foo.ts"`.

But `tool.call()` receives the model's original `~/foo.ts`. Why? Because the tool result message embeds the path verbatim: `"File updated successfully at: ~/foo.ts"`. That string is written to the transcript. If the expanded path reached `call()`, the transcript output would change and break VCR test fixtures that match on exact transcript hashes.

Two copies exist for different audiences: hooks see the expanded clone, the tool sees the model's original. If a hook or permission flow returns a fresh `updatedInput`, that replacement is intentional and does reach `call()` — only the backfill expansion is kept away from it.

> Same pattern as `CacheSafeParams` — never mutate what gets recorded/cached, operate on a copy instead. See [`08-backgroundCalls/cacheSafeParams.md`](../../08-backgroundCalls/cacheSafeParams.md).

**7. `PreToolUse` hooks**
User-defined hooks that run before permission check. Can: add context, approve/deny the tool, modify the input (`updatedInput`), or stop execution (`preventContinuation`).

**8. Permission check (`canUseTool`)**
The full permission gate: permission rules → hooks → user prompt (if needed). May update `processedInput` if the user or a hook modified the input. If denied, returns a rejection result and runs `PermissionDenied` hooks.

**9. `tool.call()`**
The actual tool execution. Receives `callInput` — which is the model's original input unless a hook/permission flow explicitly replaced it. `userModified` is passed so tools like `FileEditTool` can note when the user changed the proposed input.

**10. Result serialization**
`mapToolResultToToolResultBlockParam()` converts the result to API wire format. If the result exceeds `maxResultSizeChars`, it's persisted to disk and replaced with a file path reference.

**11. `PostToolUse` hooks**
Run after the tool completes. Can modify the tool output before it's returned to the model.

**Progress messages** from `onToolProgress` are enqueued to a `Stream` and yielded immediately throughout steps 7–11 — they don't wait for the tool to finish.
