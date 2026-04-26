# Context / System Prompt Assembly

Reference: [`src/context.ts`](../../src/context.ts), [`src/utils/queryContext.ts`](../../src/utils/queryContext.ts)

The system prompt is dynamic — assembled fresh each session from multiple sources: CLAUDE.md files, memory files, git status, tool descriptions, and feature-gated sections.

## Contents

- (to be filled)

## Key areas to study

- `fetchSystemPromptParts()` — composition entry point
- CLAUDE.md discovery and merging
- Memory file injection
- Tool description inclusion
- Feature-gated prompt sections
