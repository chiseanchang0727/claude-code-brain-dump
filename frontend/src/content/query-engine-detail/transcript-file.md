# Transcript File

Every session writes a `.jsonl` file under `~/.claude/projects/`, one JSON line per message. The file is **append-only** — it is never rewritten or truncated.

## recordTranscript()

The core write function. Append-only and incremental:

1. **Cleans** messages for logging (strips ephemeral fields)
2. **Deduplicates** — checks which messages are already recorded by UUID
3. **Writes only new messages** via `insertMessageChain()`
4. **Returns** the UUID of the last recorded message for chain continuity

## UUID Parent Chain

Every message carries two fields:

```ts
{
  uuid: "abc-123",        // this message's identity
  parentUuid: "xyz-789",  // the message it follows
  ...
}
```

Together they form a **linked list** — a chain of pointers walking backwards through the conversation.

## What the chain enables

**Branching** — fork, resume, and rewind create multiple branches in the same file. The parent chain lets you reconstruct just the branch you care about by walking back from any endpoint.

**Append-only safety** — old and rewound messages stay in the file forever. The parent chain distinguishes the current branch from abandoned ones — nothing is ever lost.

**Parallel execution** — subagents, background tasks, and tool results can all write concurrently. Each one's messages chain independently via their own parent UUIDs, so there is no write conflict.

**Resume** — `--resume` calls `buildConversationChain()`, which walks parent UUIDs from the last message back to the root. Same idea as following git commits to reconstruct history.

## The git DAG analogy

> Think of it like a git object store: a flat append-only file with pointer-based history. Branching, parallel work, and rewind are all just a matter of which pointers you follow.

The JSONL file is the object store. Each message is a commit. The `parentUuid` is the parent pointer. `buildConversationChain()` is `git log`.
