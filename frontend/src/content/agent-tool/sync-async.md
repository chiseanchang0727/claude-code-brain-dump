# Sync vs Async

Before executing, `AgentTool` decides whether to run the subagent synchronously (blocking the caller until done) or asynchronously (returning a task ID immediately).

## shouldRunAsync

```ts
shouldRunAsync =
     run_in_background === true         // caller explicitly asked
  || selectedAgent.background === true  // agent definition prefers async
  || isCoordinator                      // coordinator agents always async
  || proactiveActive                    // proactive mode always async
  && !isBackgroundTasksDisabled
```

## Sync Mode

`call()` awaits the full agent result before returning. The subagent's final response is inlined directly into the tool result seen by the model.

## Async Mode

The agent is registered as a `LocalAgentTask` and `call()` returns immediately with a task ID. The result arrives later as a `<task-notification>` injected into the conversation.

This enables parallelism: a coordinator can spawn multiple async agents in one turn, then collect their results as task notifications arrive — without blocking between spawns.
