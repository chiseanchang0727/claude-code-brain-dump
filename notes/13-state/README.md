# State Management

Reference: [`src/state/AppState.tsx`](../../src/state/AppState.tsx), [`src/state/AppStateStore.ts`](../../src/state/AppStateStore.ts)

Root app state with a listener pattern — a lightweight observable store (not Redux, not Zustand) wiring React UI to conversation/session state.

## Contents

- (to be filled)

## Key areas to study

- `AppStateStore` — the store shape and listener subscription model
- How conversation messages flow into UI state
- How tool execution results update state
- React context providers in `src/context/`
