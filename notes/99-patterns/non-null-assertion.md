# Non-Null Assertion (`!`)

## The Pattern

TypeScript's `!` after a variable tells the compiler: "I know this is not `null` or `undefined`, trust me."

```typescript
// TypeScript complains: extractMemoriesModule might be null
extractMemoriesModule.executeExtractMemories(...)

// ! says "I checked, it's not null"
extractMemoriesModule!.executeExtractMemories(...)
```

## Common usage in this codebase

Feature-gated modules are loaded conditionally:

```typescript
const extractMemoriesModule = feature('EXTRACT_MEMORIES')
  ? (require('../services/extractMemories/extractMemories.js') as ...)
  : null
// Type is: Module | null
```

The call site is inside the same feature guard:

```typescript
if (feature('EXTRACT_MEMORIES') && ...) {
  void extractMemoriesModule!.executeExtractMemories(...)
  //                        ^ safe because the if already checked the flag
}
```

The `if` guarantees the module is loaded, but TypeScript can't infer that `feature('EXTRACT_MEMORIES')` in the `if` means `extractMemoriesModule` is non-null. The `!` bridges that gap.

## Python equivalent

Python doesn't have static null checks, so there's no direct equivalent. Closest analogy:

```python
assert extract_memories_module is not None
extract_memories_module.execute_extract_memories(...)
```

## Risk

`!` is a promise to the compiler, not a runtime check. If you're wrong, you get a runtime `TypeError: Cannot read properties of null`. Use it only when the null case is already guarded by surrounding logic.
