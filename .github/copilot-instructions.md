# Copilot Instructions

## Commands

All commands run from `frontend/`:

```bash
npm run dev      # dev server at localhost:5173
npm run build    # tsc + vite build
npm run lint     # eslint
```

No test suite exists.

## Architecture

### Stack-based navigation

The app uses a stack-based navigator (`useSceneNav`). The history stack holds `HistoryItem` entries—either a scene index or a content key. `pushScene` and `pushContent` add to the stack; `popTo` and Escape/← trim it. `SceneNav` renders the breadcrumb.

### Two page types

- **Scene** (`Scene.tsx`) — diagram with positioned boxes, SVG arrows, and optional region outlines. Clicking a box opens a content page, navigates to another scene, or shows a tooltip.
- **ContentPage** (`ContentPage.tsx`) — markdown page with optional panels above (animations or split layout).

### Data model

Everything is defined in `src/data/scenes.ts`:
- `BoxDef` — position (x/y as %), variant color, and action: `navigateTo`, `detail`, or `description`
- `ArrowDef` — from/to box ids, optional label/dashed/curved/color
- `RegionDef` — labeled outline grouping box ids
- `SceneDef` — composes boxes + arrows + regions + optional panels

Content panels are registered in `src/data/contentPanels.ts`, keyed by content key.

### Arrow rendering

Arrows use hardcoded box dimensions in `Arrow.tsx`:
- `BOX_HW = 83` (half-width)
- `BOX_HH = 35` (half-height)

SVG is rendered after box divs so arrows appear on top.

### Content system

Markdown files in `src/content/{contentKey}.md` are loaded via `import.meta.glob` in `src/content/index.ts`. The `# Title` heading is parsed separately; the rest goes to ReactMarkdown.

## Conventions

### Theme centralization

All colors/styles are in `src/theme.ts`. Box variants: `default`, `green`, `yellow`, `amber`, `red`, `blue`, `ghost`. Never hardcode colors—add to theme instead.

### Font size minimums

| Context | Minimum |
|---|---|
| Content/message text | `text-sm` |
| Role labels, pill text | `text-xs` |
| Footer hints | `text-[10px]` |

### Adding illustrated content pages

1. Create animation component using `usePhasePlayer` hook
2. Add key to `PanelDef.animation` union in `src/types/index.ts`
3. Register in `PanelContent` in `ContentPage.tsx`
4. Add to `src/data/contentPanels.ts`
5. Set `defaultPanel` on the box in `src/data/scenes.ts`

Split layout (`layout: 'split'`): animation left, markdown right, no tab bar.

### Edit Layout mode

The dev server has a `/save-layout` POST endpoint (via `vite.config.ts`) that writes box positions to `src/data/positions.json`.
