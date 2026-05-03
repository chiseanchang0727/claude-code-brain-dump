# Per-Tool Pipeline

**File:** `src/services/tools/toolExecution.ts` → `runToolUse()` → `checkPermissionsAndCallTool()`

Every individual tool call goes through this sequential pipeline, no matter which execution mode dispatched it.

## Steps

**1. Tool lookup**
Find the tool by name in the active tool list. Falls back to deprecated aliases (e.g. old transcripts calling `"KillShell"` → now `"TaskStop"`). If not found, returns an error result immediately — no exception thrown.

**2. Abort check**
If the abort controller is already fired (user interrupted or sibling error), skip everything and return a cancellation result.

**3. Zod schema validation**
Parse the raw input through the tool's `inputSchema`. Type mistakes genuinely happen — the model may send a string where an array is expected. On failure, the error is returned tagged with a specific prefix:

```
<tool_use_error>InputValidationError: expected array, got string</tool_use_error>
```

The `InputValidationError` prefix is a machine-readable signal. The model recognizes it, corrects its input, and retries on the next turn — through the normal query loop, with no special retry machinery needed.

**4. `validateInput()` — semantic validation**
Tool-specific checks beyond types. Runs *before* asking the user for permission — don't prompt if the action is already impossible.

- `FileEditTool` — checks the file exists and `old_string` is present in it
- `BashTool` — may check for obviously unsafe patterns

On failure, the error message is the model's entire signal. A good message guides the correction:

```
old_string not found in file. The file currently contains:
[excerpt of actual file content]
```

The model reads this, sees the real content, and retries with the correct string.

**5. Speculative classifier (Bash only)**
`startSpeculativeClassifierCheck()` fires immediately — it starts the auto-mode security classifier in parallel with the upcoming permission check, so the result is ready when it's needed.

**6. `backfillObservableInput()`**
Creates a shallow clone of the input with fields expanded (e.g. `~/foo.ts` → `/home/sean/foo.ts`). Hooks and `canUseTool` see the expanded clone. The tool's `call()` receives the model's original input — because the tool result message embeds the path verbatim, and that string is recorded in the transcript. Expanding it would change transcript hashes and break test fixtures.

**7. `PreToolUse` hooks**
User-defined hooks that run before the permission check. Can add context, approve/deny the call, modify the input (`updatedInput`), or stop execution (`preventContinuation`).

**8. Permission check — `canUseTool()`**
The full permission gate: permission rules → hooks → user prompt if needed. If denied, returns a rejection result and runs `PermissionDenied` hooks.

**9. `tool.call()`**
The actual execution. Receives `callInput` — the model's original input unless a hook or permission flow explicitly replaced it. `userModified` is passed so tools like `FileEditTool` can note when the user changed the proposed input, keeping Claude's mental model of the codebase in sync.

**10. Result serialization**
`mapToolResultToToolResultBlockParam()` converts the result to API wire format. If the result exceeds `maxResultSizeChars`, it's persisted to disk and replaced with a file path reference.

**11. `PostToolUse` hooks**
Run after the tool completes. Can modify the tool output before it's returned to the model.

## Self-correction in practice

There is no special retry loop. When validation fails at step 3 or 4, the error travels through the normal query loop as a `tool_result`. The model reads it, reasons about what went wrong, and generates a corrected tool call on the next turn. The query loop handles it; the tool pipeline doesn't need to know a retry is happening.
