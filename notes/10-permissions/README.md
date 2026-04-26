# Permissions

Reference: [`src/hooks/useCanUseTool.ts`](../../src/hooks/useCanUseTool.ts), [`src/permissions/`](../../src/permissions/)

Granular permission model: per-tool + per-filesystem-path, with enterprise policy support and user denial tracking persisted across the session.

## Contents

- (to be filled)

## Key areas to study

- `useCanUseTool` — the gate called before every tool execution
- Policy sources: user settings, enterprise MDM, session denials
- Filesystem-level path restrictions
- How denials are tracked and surfaced in the UI
