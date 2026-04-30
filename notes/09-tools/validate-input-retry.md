# ValidateInput and the Self-Correction Loop `#resilience`

Reference: [`src/services/tools/toolExecution.ts`](../../src/services/tools/toolExecution.ts) — `checkPermissionsAndCallTool`, steps 3–4

## Big Picture

When a tool call fails validation, there's no special retry mechanism — no loop, no fallback path. The error travels through the **normal query loop** as a `tool_result`, the model reads it in context, and on the next turn it decides how to correct itself. The system's resilience comes from a carefully chosen error tag, not from extra machinery.

## Two Kinds of Validation

Step 3 and step 4 of the per-tool pipeline are distinct:

| Step | What it checks | On failure |
|------|---------------|-----------|
| **3 — Zod schema** | Type correctness (string vs array, missing required fields) | Returns `InputValidationError: ...` to model |
| **4 — `validateInput()`** | Semantic correctness (does `old_string` actually appear in the file?) | Returns a descriptive error to model |

Both return results to the model; neither throws an exception into the query loop. The model is the one that retries.

## Why the Error Tag Matters

When Zod validation fails, the error is returned tagged with a specific prefix:

```
<tool_use_error>InputValidationError: expected array, got string</tool_use_error>
```

The `InputValidationError` prefix is a **machine-readable signal**. The model recognizes this tag and knows:
- The problem is with *my input*, not the tool itself
- I should correct the input and retry on the next turn
- I should not try a different approach or give up

Without a recognizable tag, the model might treat a type error as a runtime failure and abandon the task.

## What `validateInput()` Actually Does

This is tool-specific semantic checking that runs *before* asking the user for permission. The purpose: don't ask the user "do you want to allow this edit?" if the edit is already impossible.

Examples:
- **`FileEditTool`** — checks the file exists and `old_string` is present in it
- **`BashTool`** — may check for obviously unsafe patterns before the security classifier runs

If `validateInput()` fails, the error message is the model's entire signal for what to do next. A good error message guides the correction:

```
old_string not found in file. The file currently contains:
[excerpt of actual file content]
```

The model reads this, sees the real content, and retries with the correct string.

## How the Self-Correction Loop Works

```
Model generates tool call with old_string = "func foo() {" (wrong)
      ↓
validateInput() → old_string not found, returns error + file excerpt
      ↓
Normal tool_result returned to model:
  "old_string not found in file. File contains: ..."
      ↓
Model's next turn: reads error, sees actual content, corrects the input
      ↓
Model generates new tool call with old_string = "func foo(ctx context.Context) {" (correct)
      ↓
validateInput() passes → proceeds to permission check → executes
```

No special retry loop. The correction happens through the same mechanism as everything else: the model reasons about what it observed and decides what to do next.

## The Key Insight: Error as Context

The authors' note: *"the model is not great at generating valid input"* — this is a direct acknowledgement that Zod validation is a genuine necessity, not defensive code. Type mistakes (sending a string where an array is expected) genuinely happen in practice.

The solution doesn't try to prevent these errors — it makes recovering from them trivially cheap. A well-tagged error message with enough context is all the model needs. The query loop handles it; the tool execution pipeline doesn't need to know a retry is happening.

## Deferred Tool Hint

If a deferred tool fails at Zod validation because its schema was never sent to the API, the error appends an extra hint:

```
InputValidationError: ... Load the tool first via ToolSearch, then retry.
```

Same pattern: the hint is embedded in the error message, the model reads it, the query loop handles it.
