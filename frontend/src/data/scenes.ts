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
        x: 29, y: 50,
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
        id: 'query-loop',
        label: 'Query Loop',
        sublabel: 'query.ts',
        x: 71, y: 50,
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
      { from: 'query-engine', to: 'query-loop', label: 'messages[]' },
      { from: 'query-loop', to: 'result', label: 'Terminal' },
    ],
    panels: [
      { label: '💡 Overview', animation: 'flow-overview' },
    ],
    hideDiagramTab: true,
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
        id: 'system-prompt',
        label: 'System Prompt',
        sublabel: 'fetchSystemPromptParts()',
        x: 10, y: 68,
        detail: { contentKey: 'architecture-flow/system-prompt' },
      },
      {
        id: 'tools',
        label: 'Tools',
        sublabel: 'what the model can do',
        x: 10, y: 28,
        detail: { contentKey: 'query-engine-detail/tools' },
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
        variant: 'blue',
        detail: { contentKey: 'query-engine-detail/transcript-file', defaultPanel: 0 },
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
        elevated: true,
        description: 'Same QueryEngine instance for the whole session. Holds mutableMessages (full history), totalUsage (accumulated cost), permissionDenials, and readFileState. Still here when the next user message arrives.',
      },
    ],
    arrows: [
      { from: 'system-prompt', to: 'prepare' },
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
        label: 'QueryEngine',
        boxes: ['system-prompt', 'tools', 'model-config', 'mcp-servers', 'custom-prompts', 'prepare', 'understand', 'save', 'run', 'transcript-file', 'disk', 'per-turn-state', 'merge', 'session-state'],
        padding: 48,
        color: '#52525b',
        labelAlign: 'center',
      },
      {
        label: '',
        boxes: ['prepare', 'understand', 'save', 'run'],
        padding: 28,
        color: '#4ade80',
      },
    ],
    panels: [
      {
        label: 'QueryEngine ↔ query loop',
        contentKey: 'query-engine-detail/async-generator',
        animation: 'async-generator',
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
        navigateTo: 'tool-execution-pipeline',
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
        label: 'Snip Compact',
        sublabel: 'surgical',
        x: 50, y: 28,
        variant: 'green',
        detail: { contentKey: 'compaction-pipeline/snip', defaultPanel: 0 },
      },
      {
        id: 'microcompact',
        label: 'Microcompact',
        sublabel: 'time_gap/count_threshold',
        x: 50, y: 46,
        variant: 'yellow',
        detail: { contentKey: 'compaction-pipeline/microcompact', defaultPanel: 0 },
      },
      {
        id: 'context-collapse',
        label: 'Context Collapse',
        sublabel: 'project',
        x: 50, y: 64,
        variant: 'amber',
        detail: { contentKey: 'compaction-pipeline/context-collapse', defaultPanel: 0 },
      },
      {
        id: 'autocompact',
        label: 'Autocompact',
        sublabel: 'token count ≥ threshold',
        x: 50, y: 82,
        variant: 'red',
        detail: { contentKey: 'compaction-pipeline/autocompact', defaultPanel: 0 },
      },
    ],
    arrows: [
      { from: 'input', to: 'snip' },
      { from: 'snip', to: 'microcompact' },
      { from: 'microcompact', to: 'context-collapse' },
      { from: 'context-collapse', to: 'autocompact' },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene — Tool Execution Pipeline (09-tools)
  // ─────────────────────────────────────────────
  {
    id: 'tool-execution-pipeline',
    title: 'Tool Execution Pipeline',
    crumb: 'Tool Execution',
    boxes: [
      {
        id: 'tool-blocks',
        label: 'tool_use Blocks',
        sublabel: 'from model response',
        x: 50, y: 12,
        description: 'When the model decides to use a tool, it returns one or more tool_use blocks in its response. Each block has a tool name, a unique ID, and the input the model wants to pass.',
      },
      {
        id: 'streaming',
        label: 'Streaming Executor',
        sublabel: 'StreamingToolExecutor',
        x: 26, y: 36,
        variant: 'blue',
        detail: { contentKey: 'tool-execution-pipeline/streaming', defaultPanel: 0 },
      },
      {
        id: 'batch',
        label: 'Batch Mode',
        sublabel: 'runTools()',
        x: 74, y: 36,
        detail: { contentKey: 'tool-execution-pipeline/batch' },
      },
      {
        id: 'partition',
        label: 'Concurrency Partition',
        sublabel: 'partitionToolCalls()',
        x: 50, y: 60,
        variant: 'amber',
        detail: { contentKey: 'tool-execution-pipeline/partition', defaultPanel: 0 },
      },
      {
        id: 'per-tool',
        label: 'Per-Tool Pipeline',
        sublabel: 'runToolUse() · 11 steps',
        x: 50, y: 84,
        variant: 'green',
        detail: { contentKey: 'tool-execution-pipeline/per-tool', defaultPanel: 0 },
      },
    ],
    arrows: [
      { from: 'tool-blocks', to: 'streaming', label: 'streaming mode' },
      { from: 'tool-blocks', to: 'batch',     label: 'batch mode' },
      { from: 'streaming',   to: 'partition' },
      { from: 'batch',       to: 'partition' },
      { from: 'partition',   to: 'per-tool',  label: 'one call at a time' },
      { from: 'per-tool', to: 'tool-blocks',  label: 'validation error → model retries', curved: true, dashed: true },
    ],
    regions: [
      {
        label: 'Execution Mode',
        boxes: ['streaming', 'batch'],
        padding: 24,
        color: '#52525b',
      },
    ],
  },
]
