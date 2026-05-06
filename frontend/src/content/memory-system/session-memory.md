# Session Memory

- When the context window fills up, instead of paying to summarize the conversation on the spot, the summary is already written — session memory has been updating it in the background all along.

It saves a structured snapshot of the current session — not facts about the user, but the working state of this specific conversation. Eight fixed sections:

| Section | What goes in it |
|---|---|
| Current State | What's actively being worked on right now, pending tasks, next steps |
| Task specification | What the user asked to build, design decisions |
| Files and Functions | Which files matter and why |
| Workflow | Bash commands typically run, how to interpret output |
| Errors & Corrections | What failed, what the user corrected, what not to try again |
| Codebase and System Documentation | How key components work and fit together |
| Learnings | What worked, what didn't, what to avoid |
| Key results | Exact outputs the user asked for (tables, answers, documents) |
| Worklog | Terse step-by-step log of what was attempted/done |

The critical one is **Current State** — the prompt specifically says "always update this to reflect the most recent work, this is critical for continuity after compaction." When compaction kicks in and replaces the conversation with a summary, Current State is what tells the model where it left off.

It's essentially the notes a developer would keep on a notepad while working — specific enough (file paths, function names, exact commands, error messages) that someone could pick up and continue the work from scratch.
