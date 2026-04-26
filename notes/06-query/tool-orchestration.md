# Tool Orchestration

Reference: [src/services/tools/toolOrchestration.ts](../../src/services/tools/toolOrchestration.ts)

Related: [streaming-tool-execution.md](./streaming-tool-execution.md) (the streaming alternative), [execution-flow.md — step 8](./execution-flow.md#8-tool-execution-lines-1363-1409)

## Overview

`runTools()` is the **sequential fallback** for tool execution — used when streaming tool execution is disabled or unavailable. It's the simpler of the two paths at step 8 of the query loop. While `StreamingToolExecutor` starts tools during streaming, `runTools()` waits for the model to finish, then executes all tool calls.

Both paths share the same concurrency concept: some tools are safe to run in parallel, others must run alone.

## The Partitioning Algorithm

The key insight is `partitionToolCalls()` — it splits the model's tool calls into ordered batches:

**User says:** "How's the project structured? Also create a notes folder for me"

```
Model requests: [Read package.json, Glob "src/**", Bash "mkdir notes", Read tsconfig.json]
                 ─────────────────────────────────  ─────────────────  ──────────────────
                  concurrent batch 1                 serial batch 2     concurrent batch 3
                  (both read-only)                   (creates directory) (read-only)
```

**Note:** If all tool calls are concurrency-safe, they all merge into a single batch:

```
Model requests: [Read A, Grep B, Glob C, Read D]
                 ────────────────────────────────
                  single concurrent batch — all 4 run at once
```

The only thing that "breaks" a batch is a non-concurrency-safe tool appearing in the sequence.

**How it works** — `partitionToolCalls()` (line 91) does a single-pass `reduce` over the tool list:

```typescript
function partitionToolCalls(toolUseMessages, toolUseContext): Batch[] {
  return toolUseMessages.reduce((acc, toolUse) => {
    const tool = findToolByName(toolUseContext.options.tools, toolUse.name)
    const parsedInput = tool?.inputSchema.safeParse(toolUse.input)
    const isConcurrencySafe = parsedInput?.success
      ? Boolean(tool?.isConcurrencySafe(parsedInput.data))
      : false   // parse failed → assume unsafe (conservative)
    if (isConcurrencySafe && acc[acc.length - 1]?.isConcurrencySafe) {
      acc[acc.length - 1]!.blocks.push(toolUse)  // grow current concurrent batch
    } else {
      acc.push({ isConcurrencySafe, blocks: [toolUse] })  // start new batch
    }
    return acc
  }, [])
}
```

For each tool call: parse its input, check `isConcurrencySafe()`. If safe **and** the previous batch was also safe → merge into that batch. Otherwise → start a new batch.

If **all** tool calls are concurrency-safe, they all merge into a single batch and run in parallel. For example, `[Read A, Grep B, Glob C, Read D]` → one batch, all four run concurrently.

**Rules (summary):**
1. Each tool declares `isConcurrencySafe(input)` — "given these specific arguments, can I safely run alongside other concurrency-safe tools?"
2. Consecutive concurrency-safe tools are grouped into one batch → run in parallel
3. A non-concurrency-safe tool always gets its own batch → runs alone
4. Order between batches is preserved (batch 1 finishes before batch 2 starts)

## `isConcurrencySafe` — Per-Tool Declaration

Each tool implements this method. It receives the parsed input and returns a boolean. Default is `false` (conservative — assume unsafe).

**Examples:**
- **Bash:** safe only if the command is read-only (no `cd`, no writes). Uses `checkReadOnlyConstraints()` to analyze the command
- **Read, Glob, Grep:** always safe (pure read operations)
- **Edit, Write:** never safe (file mutations could conflict)
- **Agent:** never safe (spawns a full query loop)

The check is per-invocation, not per-tool-type. `bash "cat foo.txt"` is concurrency-safe, `bash "rm foo.txt"` is not. The input is parsed first via the tool's Zod schema — if parsing fails, the tool is treated as non-concurrency-safe (conservative fallback).

## Concurrent Execution

When a batch is concurrency-safe, `runToolsConcurrently()` uses the `all()` utility from `src/utils/generators.ts`. This is an async generator combiner that:

1. Takes N async generators (one per tool)
2. Runs them with a concurrency cap (default: 10, configurable via `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`)
3. Yields results from whichever generator produces output first (interleaved)

**Context modifier queuing:** Concurrent tools can't apply context modifications immediately (they'd race). Instead, context modifiers are queued per tool ID and applied **after** the entire concurrent batch finishes, in the original tool order. This ensures deterministic context state.

```
Concurrent batch: [Read A, Read B, Grep C]
  → all three run simultaneously
  → results yielded as they complete (any order)
  → context modifiers queued
  → batch done → modifiers applied in tool order (A, B, C)
```

## Serial Execution

Non-concurrency-safe tools run one at a time via `runToolsSerially()`. Each tool:
1. Gets added to `inProgressToolUseIDs` (for UI tracking)
2. Runs via `runToolUse()` — the shared execution function
3. Context modifiers applied **immediately** (no queuing needed — only one tool running)
4. Removed from `inProgressToolUseIDs`

## Context Modifiers

Some tools modify the `ToolUseContext` as a side effect — for example, changing the current directory or updating permissions state. These are returned as `contextModifier` objects:

```typescript
{ toolUseID: string, modifyContext: (context: ToolUseContext) => ToolUseContext }
```

The critical difference between concurrent and serial batches:
- **Serial:** modifiers applied immediately, next tool sees updated context
- **Concurrent:** modifiers queued, applied after batch completes (tools in the batch see the pre-batch context)

## Tool Status Lifecycle

Both paths track tool IDs in `inProgressToolUseIDs` (a `Set<string>` on `ToolUseContext`):

```
pending → in_progress (added to set) → complete (removed from set)
```

This powers the UI spinner — showing which tools are currently running.

## Comparison with StreamingToolExecutor

| Aspect | `runTools()` (this file) | `StreamingToolExecutor` |
|--------|--------------------------|------------------------|
| When tools start | After model finishes | During model streaming |
| Batch strategy | Partition all at once | Dynamic as blocks arrive |
| Concurrency | `all()` utility with cap | Internal queue with `canExecuteTool()` |
| Error cascading | None (independent) | Bash failure cancels siblings |
| Result ordering | Interleaved (concurrent), ordered (serial) | Always yields in original order |

Both use the same `isConcurrencySafe` check and the same `runToolUse()` function for actual execution.

## Python Analogy

Think of `partitionToolCalls` as splitting a list of tasks into "can do simultaneously" and "must do alone" groups:

```python
# Pseudo-Python equivalent
for batch in partition_tool_calls(tool_calls):
    if batch.is_concurrent:
        # Like asyncio.gather() with a semaphore
        results = await asyncio.gather(*[run_tool(t) for t in batch.tools])
        # Apply context changes in original order after all complete
    else:
        # Like a regular for loop
        for tool in batch.tools:
            result = await run_tool(tool)
            # Apply context change immediately
```
