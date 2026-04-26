# Withhold-Then-Recover

Reference: [src/query.ts](../../src/query.ts)

Separate from the state machine pattern. The state machine decides *what to do* after recovery. Withhold-then-recover decides *whether to show errors to the caller*.

**The problem:** SDK consumers (desktop app, cowork) kill the session when they see an error message. If the loop yields the error first and then successfully recovers, nobody is listening anymore — the session is already dead.

**The solution:** a two-part dance:

1. **Withhold** — during streaming, when a recoverable error arrives (prompt too long, max output tokens, media too large), it's marked `withheld = true` and NOT yielded to the caller. It's still pushed to `assistantMessages` so recovery logic can find it.

2. **Recover** — after streaming completes, the loop checks if the last message was a withheld error. If so, it attempts recovery (via the state machine transitions — collapse drain, reactive compact, escalate, etc.). Only if ALL recovery strategies fail does it finally yield the error to the caller.

**Recoverable error types:**
- Prompt too long (413) — recovered via collapse drain or reactive compact
- Max output tokens — recovered via escalation to 64K or multi-turn "resume" injection
- Media size errors — recovered via reactive compact strip-retry
