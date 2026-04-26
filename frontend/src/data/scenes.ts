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
        navigateTo: 'query-engine-detail',
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
  // Scene 1 — QueryEngine per-turn flow
  // ─────────────────────────────────────────────
  {
    id: 'query-engine-detail',
    title: 'QueryEngine — per turn',
    crumb: 'QueryEngine',
    boxes: [
      {
        id: 'tools',
        label: 'Tools',
        sublabel: 'what the model can do',
        x: 10, y: 28,
        description: 'Every available tool is described to the model — its name, what it does, and what inputs it accepts.',
      },
      {
        id: 'model-config',
        label: 'Model Config',
        sublabel: 'rules & constraints',
        x: 23, y: 28,
        description: 'Model-specific instructions and constraints — things like output format, safety rules, or capability limits for the selected model.',
      },
      {
        id: 'mcp-servers',
        label: 'MCP Servers',
        sublabel: 'connected servers',
        x: 36, y: 28,
        description: 'Any MCP servers currently connected can inject their own prompts into the system prompt each turn.',
      },
      {
        id: 'custom-prompts',
        label: 'Custom Prompts',
        sublabel: 'user-defined instructions',
        x: 49, y: 28,
        description: 'Instructions the user has configured — like "always respond in Spanish" or project-specific rules from CLAUDE.md.',
      },
      {
        id: 'prepare',
        label: 'Prepare',
        sublabel: 'compose instructions',
        x: 28, y: 48,
        variant: 'amber',
        description: 'Assembles all inputs into the system prompt sent to the model this turn.',
      },
      {
        id: 'understand',
        label: 'Understand',
        sublabel: 'parse the message',
        x: 48, y: 48,
        variant: 'amber',
        description: 'Reads what the user sent. Handles special /commands locally if needed. Decides whether a real AI call is necessary at all.',
      },
      {
        id: 'save',
        label: 'Save',
        sublabel: 'write to disk first',
        x: 68, y: 48,
        variant: 'amber',
        description: 'Writes the user message to the transcript before anything else. If the process crashes mid-turn, the message is never lost.',
      },
      {
        id: 'run',
        label: 'Run',
        sublabel: 'hand off to query loop',
        x: 88, y: 48,
        variant: 'amber',
        navigateTo: 'query-loop-detail',
      },
      {
        id: 'transcript-file',
        label: 'Transcript File',
        sublabel: '.jsonl on disk',
        x: 72, y: 30,
        description: 'One JSON line appended per message — user, assistant, tool results, final cost. Written before the API call so nothing is lost on crash.',
      },
      {
        id: 'disk',
        label: 'Local Disk',
        sublabel: '~/.claude/projects/...',
        x: 88, y: 18,
        description: 'Transcript files are stored under ~/.claude/projects/, namespaced by working directory. One file per session, named by session ID. Survives process crashes and restarts.',
      },
      {
        id: 'per-turn-state',
        label: 'Per-turn State',
        sublabel: 'lives only this turn',
        x: 88, y: 65,
        description: 'query.ts creates a fresh State struct every turn: turnCount, toolUseContext, needsFollowUp, messagesForQuery. All of it is discarded the moment the turn ends — nothing carries over.',
      },
      {
        id: 'merge',
        label: 'Merge',
        sublabel: 'final messages → history',
        x: 62, y: 82,
        description: 'When query() finishes, QueryEngine takes the final messages and merges them into mutableMessages. That is the only thing that survives into the next turn. The per-turn State is gone.',
      },
      {
        id: 'session-state',
        label: 'Session State',
        sublabel: 'persists across all turns',
        variant: 'ghost',
        x: 35, y: 82,
        description: 'Same QueryEngine instance for the whole session. Holds mutableMessages (full history), totalUsage (accumulated cost), permissionDenials, and readFileState. Still here when the next user message arrives.',
      },
    ],
    arrows: [
      { from: 'tools',         to: 'prepare' },
      { from: 'model-config',  to: 'prepare' },
      { from: 'mcp-servers',   to: 'prepare' },
      { from: 'custom-prompts', to: 'prepare' },
      { from: 'prepare',       to: 'understand', color: '#b45309' },
      { from: 'understand',    to: 'save',       color: '#b45309' },
      { from: 'save',          to: 'run',        color: '#b45309' },
      { from: 'save',          to: 'transcript-file' },
      { from: 'transcript-file', to: 'disk' },
      { from: 'run',           to: 'per-turn-state', label: 'creates fresh' },
      { from: 'per-turn-state', to: 'merge',     label: 'done' },
      { from: 'merge',         to: 'session-state' },
    ],
    regions: [
      {
        label: 'Session State scope',
        boxes: ['prepare', 'understand', 'save', 'run'],
        padding: 28,
        color: '#4ade80',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene 2 — Query Loop internals (06-query)
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
