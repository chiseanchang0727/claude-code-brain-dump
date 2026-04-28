# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `frontend/`:

```bash
npm run dev      # dev server at localhost:5173
npm run build    # tsc + vite build
npm run lint     # eslint
```

No test suite exists.

The dev server includes a `/save-layout` POST endpoint (injected via `vite.config.ts`) that writes box positions back to `src/data/positions.json` when using Edit Layout mode in the UI.

---

## Architecture

### Navigation model

The app is a stack-based navigator (`useSceneNav`). The history stack holds `HistoryItem` entries — either a scene index or a content key. `pushScene` and `pushContent` add to the stack; `popTo` and Escape/← trim it. `SceneNav` renders the breadcrumb from the stack.

### Two page types

**Scene** (`Scene.tsx`) — a diagram with positioned boxes, SVG arrows, and optional region outlines. Clicking a box either opens a content page, navigates to another scene, or shows a tooltip bubble.

**ContentPage** (`ContentPage.tsx`) — a markdown page, optionally with named panels above it. Panels can be animations or a split layout (animation left, markdown right).

### Data model

Everything is defined in `src/data/scenes.ts`:
- `BoxDef` — position (x/y as % of container), variant color, and one of: `navigateTo` (scene id), `detail` (content key + optional defaultPanel), or `description` (tooltip text)
- `ArrowDef` — from/to box ids, optional label, dashed, curved, color
- `RegionDef` — a labeled outline grouping box ids
- `SceneDef` — composes boxes + arrows + regions + optional scene-level panels

Content panels (animations attached to content pages) are registered separately in `src/data/contentPanels.ts`, keyed by content key.

### Arrow rendering

Arrows are SVG paths drawn in `Arrow.tsx`. `offsetToEdge()` ray-casts from center to center and finds where the line exits each box's rectangular boundary using hardcoded constants:
- `BOX_HW = 83` — box half-width (w-40 = 80px + 3px so arrowhead tip lands at edge)
- `BOX_HH = 35` — box half-height (py-2.5 + label + sublabel ≈ 58px, half 29 + tip offset)

The SVG is rendered **after** box divs in the DOM so it sits on top.

### Content system

Markdown files live in `src/content/{contentKey}.md`. They are loaded eagerly via `import.meta.glob` in `src/content/index.ts`. The `# Title` heading is parsed out and rendered separately; the rest is passed to `ReactMarkdown`. All markdown styles come from `theme.panel.md`.

### Theme

All colors and styles are centralized in `src/theme.ts`. Box variants (`default`, `green`, `yellow`, `amber`, `red`, `blue`, `ghost`) control background, border, and sublabel colors. Never hardcode colors in components — add to theme if needed.

---

## Adding a new illustrated content page

Three steps:

**1. Create the animation component** — `src/components/XxxAnimation.tsx`

Use `usePhasePlayer` from `src/hooks/usePhasePlayer.ts`:
```ts
const { phaseIdx, phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
  usePhasePlayer(PHASES, PHASE_DURATIONS)
```
- `PHASES` — `as const` string array of phase names
- `PHASE_DURATIONS` — `number` or `number[]` of ms per phase for auto-play
- Render a ▶/⏸ toggle button + ← back / next → buttons at the bottom
- `reset()` resets to phase 0 and increments `cycle` (use `cycle` as React key to force re-mount)
- Auto-play is only appropriate for ambient looping animations with no discrete steps.

**2. Wire it up:**
- Add the key to `PanelDef.animation` union in `src/types/index.ts`
- Register it in `PanelContent` in `src/components/ContentPage.tsx`
- Add to `src/data/contentPanels.ts`:
```ts
'content-key/page': [{ label: 'Illustration', animation: 'xxx', layout: 'split' }]
```

**3. Set default panel on the box** in `src/data/scenes.ts`:
```ts
detail: { contentKey: 'content-key/page', defaultPanel: 0 }
```

### Split layout behavior

When a panel has `layout: 'split'`: left half renders the animation, right half renders the markdown, no tab bar is shown. The existing tab-bar + "Description" tab flow is used for all other panels.

### Font size minimums

| Context | Minimum |
|---|---|
| Content / message text | `text-sm` |
| Role labels, pill text | `text-xs` |
| Footer hints | `text-[10px]` |
