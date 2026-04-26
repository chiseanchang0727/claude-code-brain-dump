# Background API Call Patterns

Two patterns for making API calls outside the main query loop. Both run in the background without blocking the user.

## Contents

- [sideQuery.md](./sideQuery.md) — Single API call, no tools, for lightweight tasks (classify, select, validate)
- [forkedAgent.md](./forkedAgent.md) — Full query loop fork with tools, shares parent's prompt cache
- [cacheSafeParams.md](./cacheSafeParams.md) — How forked agents share the parent's prompt cache

## Quick Comparison

| | sideQuery | forkedAgent |
|--|-----------|-------------|
| **What** | Single API call | Full query loop (multiple turns) |
| **Tools** | No | Yes (Read, Write, Bash, etc.) |
| **Streaming** | No | Yes |
| **Cache sharing** | No (own request) | Yes (via CacheSafeParams) |
| **Model** | Caller chooses (usually Sonnet) | Inherits parent's model |
| **Use when** | Classify, select, validate | Read/write files, multi-step work |
| **Cost** | Cheap (small, fast) | Nearly free input (cache hit) |
