# Isolation Modes

`AgentTool` supports three isolation levels for the subagent's working environment, controlled by the `isolation` parameter.

| Mode | What happens |
|---|---|
| Default | Same working directory as parent |
| `worktree` | `createAgentWorktree()` creates a git worktree copy |
| `remote` (ant-only) | `teleportToRemote()` launches in CCR, always async |

## Default

The child shares the parent's working directory. File changes made by the child are immediately visible to the parent and vice versa.

## Worktree

A git worktree is created so the child works on an isolated copy of the repository. `buildWorktreeNotice()` injects a message into the child's context telling it to translate any paths it inherited from parent context. If the agent makes no changes, the worktree is automatically cleaned up.

## Remote (ant-internal)

Remote mode launches the agent in Cloud Code Runner (CCR). It is always async regardless of other settings — `call()` returns a task ID and the agent runs in the cloud.
