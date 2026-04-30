# Task System

Reference: [`src/Task.ts`](../../src/Task.ts), [`src/tasks/`](../../src/tasks/)

Background work manager with typed tasks and lifecycle states.

## Task types

| Type | Prefix | Description |
|------|--------|-------------|
| `local_bash` | `b` | Shell commands |
| `local_agent` | `a` | Sub-agents |
| `remote_agent` | `r` | Cloud-executed agents |
| `in_process_teammate` | — | Parallel in-process agents |
| `dream` | — | Speculative/background work |

States: `pending → running → completed / failed / killed`

## Contents

- (to be filled)
