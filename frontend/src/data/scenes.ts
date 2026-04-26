import type { SceneDef } from '../types'

export const scenes: SceneDef[] = [
  // ─────────────────────────────────────────────
  // Scene 0 — Architecture Flow (00-architectureFlow)
  // ─────────────────────────────────────────────
  {
    id: 'architecture-flow',
    title: 'Architecture Flow',
    crumb: 'Flow',
    boxes: [
      {
        id: 'cli',
        label: 'CLI Bootstrap',
        sublabel: 'cli.tsx',
        x: 8, y: 50,
        detail: { contentKey: 'architecture-flow/cli' },
      },
      {
        id: 'commander',
        label: 'Commander.js',
        sublabel: 'main.tsx',
        x: 26, y: 50,
        detail: { contentKey: 'architecture-flow/commander' },
      },
      {
        id: 'query-engine',
        label: 'QueryEngine',
        sublabel: 'submitMessage()',
        x: 50, y: 50,
        detail: { contentKey: 'architecture-flow/query-engine' },
      },
      {
        id: 'system-prompt',
        label: 'System Prompt',
        sublabel: 'fetchSystemPromptParts()',
        x: 38, y: 22,
        detail: { contentKey: 'architecture-flow/system-prompt' },
      },
      {
        id: 'record-transcript',
        label: 'Record Transcript',
        sublabel: 'sessionStorage.ts',
        x: 62, y: 22,
        detail: { contentKey: 'architecture-flow/record-transcript' },
      },
      {
        id: 'query-loop',
        label: 'Query Loop',
        sublabel: 'query.ts',
        x: 75, y: 50,
        navigateTo: 'query-loop-detail',
      },
      {
        id: 'result',
        label: 'Result Yielded',
        sublabel: 'cost · usage · duration',
        x: 92, y: 50,
        detail: { contentKey: 'architecture-flow/result' },
      },
    ],
    arrows: [
      { from: 'cli', to: 'commander' },
      { from: 'commander', to: 'query-engine' },
      { from: 'query-engine', to: 'system-prompt', label: 'compose' },
      { from: 'query-engine', to: 'record-transcript', label: 'persist' },
      { from: 'query-engine', to: 'query-loop', label: 'messages[]' },
      { from: 'query-loop', to: 'result', label: 'Terminal' },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene 1 — Query Loop internals (06-query)
  // ─────────────────────────────────────────────
  {
    id: 'query-loop-detail',
    title: 'Query Loop — query.ts',
    crumb: 'Query Loop',
    boxes: [
      {
        id: 'entry',
        label: 'queryLoop()',
        sublabel: 'while(true) :307',
        x: 12, y: 20,
        detail: { contentKey: 'query-loop-detail/entry' },
      },
      {
        id: 'preprocess',
        label: 'Pre-process Messages',
        sublabel: 'compaction pipeline',
        x: 38, y: 20,
        navigateTo: 'compaction-pipeline',
      },
      {
        id: 'api-stream',
        label: 'API Call + Stream',
        sublabel: 'queryModelWithStreaming()',
        x: 64, y: 20,
        detail: { contentKey: 'query-loop-detail/api-stream' },
      },
      {
        id: 'decision',
        label: 'needsFollowUp?',
        sublabel: 'tool_use blocks present?',
        x: 84, y: 40,
        detail: { contentKey: 'query-loop-detail/decision' },
      },
      {
        id: 'stop-hooks',
        label: 'Recovery / Stop Hooks',
        sublabel: '7a · 7b · 7c · 7d',
        x: 38, y: 65,
        detail: { contentKey: 'query-loop-detail/stop-hooks' },
      },
      {
        id: 'tool-exec',
        label: 'Tool Execution',
        sublabel: 'canUseTool() + runTools()',
        x: 84, y: 65,
        detail: { contentKey: 'query-loop-detail/tool-exec' },
      },
      {
        id: 'post-tool',
        label: 'Post-tool Work',
        sublabel: 'lines 1538–1628',
        x: 64, y: 65,
        detail: { contentKey: 'query-loop-detail/post-tool' },
      },
      {
        id: 'next-turn',
        label: 'State → continue',
        sublabel: 'next_turn transition',
        x: 12, y: 65,
        detail: { contentKey: 'query-loop-detail/next-turn' },
      },
    ],
    arrows: [
      { from: 'entry', to: 'preprocess' },
      { from: 'preprocess', to: 'api-stream' },
      { from: 'api-stream', to: 'decision', label: 'stream done' },
      { from: 'decision', to: 'stop-hooks', label: 'no tools' },
      { from: 'decision', to: 'tool-exec', label: 'tools called' },
      { from: 'tool-exec', to: 'post-tool' },
      { from: 'post-tool', to: 'next-turn' },
      { from: 'next-turn', to: 'entry', label: 'loop back', curved: true, dashed: true },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene 2 — Compaction Pipeline (06-query/compaction-strategies)
  // ─────────────────────────────────────────────
  {
    id: 'compaction-pipeline',
    title: 'Compaction Pipeline — Pre-process Messages',
    crumb: 'Pre-process Messages',
    boxes: [
      {
        id: 'input',
        label: 'messagesForQuery',
        sublabel: 'raw history, every iteration',
        x: 50, y: 8,
        detail: { contentKey: 'compaction-pipeline/input' },
      },
      {
        id: 'snip',
        label: '1. Snip Compact',
        sublabel: 'HISTORY_SNIP gated · surgical',
        x: 50, y: 28,
        variant: 'green',
        detail: { contentKey: 'compaction-pipeline/snip' },
      },
      {
        id: 'microcompact',
        label: '2. Microcompact',
        sublabel: 'time gap or count threshold',
        x: 50, y: 46,
        variant: 'yellow',
        detail: { contentKey: 'compaction-pipeline/microcompact' },
      },
      {
        id: 'context-collapse',
        label: '3. Context Collapse',
        sublabel: 'CONTEXT_COLLAPSE gated · projection',
        x: 50, y: 64,
        variant: 'amber',
        detail: { contentKey: 'compaction-pipeline/context-collapse' },
      },
      {
        id: 'autocompact',
        label: '4. Autocompact',
        sublabel: 'token count ≥ threshold',
        x: 50, y: 82,
        variant: 'red',
        detail: { contentKey: 'compaction-pipeline/autocompact' },
      },
    ],
    arrows: [
      { from: 'input', to: 'snip' },
      { from: 'snip', to: 'microcompact' },
      { from: 'microcompact', to: 'context-collapse' },
      { from: 'context-collapse', to: 'autocompact' },
    ],
  },
]
