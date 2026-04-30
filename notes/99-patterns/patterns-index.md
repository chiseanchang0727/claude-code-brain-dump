# Pattern Categories

Tags used across notes to flag recurring design patterns. When you see a tag in a note, look up its category here to understand what kind of problem it solves.

---

**Context Management** — Keeping Claude's mental model in sync with reality. When the world changes (file edited by user, tool result differs from expectation), Claude needs a signal or it reasons from stale assumptions.

**API Boundary** — Hiding implementation details from public SDK types or the model-facing API. Workarounds to pass extra data between layers without polluting exported schemas.

**Prompt Cache** — Decisions made specifically to preserve prompt cache hits. Byte-identical prefixes = cache hit = ~90% cheaper input tokens.

**Cost Management** — Design choices whose primary motivation is reducing API token costs. `#prompt-cache` is the main mechanism; this tag marks the places where cost is the explicit reason a decision was made.

**Staleness Guard** — Detecting and warning about outdated information before the model asserts it as fact. Prevents confident-but-wrong claims.

**Fail-Closed Default** — When uncertain, default to the safe/restrictive option. Wrong in the permissive direction is a security risk; wrong in the restrictive direction is just an inconvenience.

**Cycle Breaker** — Structural workarounds (lazy imports, extracted modules) to avoid circular dependencies in the import graph.

**Fire-and-Forget** — Launching background work without awaiting it, so the main loop is never blocked. See [`fire-and-forget.md`](./fire-and-forget.md).

**Resilience** — Designing the system to keep working (or degrade gracefully) when something diverges from expectations, rather than failing hard or silently continuing with wrong assumptions. Distinct from error handling — it's about the structure of the happy path being robust, not just catching exceptions.
