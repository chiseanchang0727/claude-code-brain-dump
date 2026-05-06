# needsFollowUp?


A boolean flag that answers: **did the model ask to use tools?**

## How it's set

Starts as `false` at the top of every iteration. During streaming, whenever a `tool_use` block appears in the assistant message, it's set to `true`:

## Why not check stop_reason?

The comment on line 554 says `stop_reason === 'tool_use'` is **unreliable**. Instead, the code inspects the actual content blocks. Like the difference between asking "did you pack groceries?" vs opening the bag and checking yourself — the code opens the bag.

## The two branches

| `needsFollowUp` | Path taken |
|-----------------|-----------|
| `false` | Recovery checks → stop hooks → return |
| `true` | Tool execution → post-tool work → next turn |

The two branches never both run in the same iteration.
