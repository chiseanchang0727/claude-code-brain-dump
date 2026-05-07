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
        id: 'tools',
        label: 'Tools',
        sublabel: 'what the model can do',
        x: 10, y: 28,
        detail: { contentKey: 'query-engine-detail/tools', defaultPanel: 0 },
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
        detail: { contentKey: 'architecture-flow/system-prompt', defaultPanel: 0 },
      },
      {
        id: 'understand',
        label: 'Understand',
        sublabel: 'parse the message',
        x: 48, y: 48,
        variant: 'amber',
        detail: { contentKey: 'query-engine-detail/understand', defaultPanel: 0 },
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
        variant: 'yellow',
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
        boxes: ['tools', 'model-config', 'mcp-servers', 'custom-prompts', 'prepare', 'understand', 'save', 'run', 'transcript-file', 'disk', 'per-turn-state', 'merge', 'session-state'],
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
        layout: 'split',
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
        detail: { contentKey: 'query-loop-detail/api-stream', defaultPanel: 0 },
      },
      {
        id: 'decision',
        label: 'needsFollowUp?',
        sublabel: 'tool_use blocks present?',
        x: 84, y: 40,
        detail: { contentKey: 'query-loop-detail/decision' },
      },
      {
        id: 'memory',
        label: 'Memory',
        sublabel: 'extraction after no-tool turn',
        x: 16, y: 65,
        variant: 'amber',
        navigateTo: 'memory-system',
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
      {
        id: 'subagents',
        label: 'AgentTool',
        sublabel: 'subagent spawning',
        x: 84, y: 85,
        variant: 'green',
        navigateTo: 'agent-tool',
      },
    ],
    arrows: [
      { from: 'entry', to: 'preprocess' },
      { from: 'preprocess', to: 'api-stream' },
      { from: 'api-stream', to: 'decision', label: 'stream done' },
      { from: 'decision', to: 'memory', label: 'no tools' },
      { from: 'decision', to: 'tool-exec', label: 'tools called' },
      { from: 'tool-exec', to: 'post-tool' },
      { from: 'tool-exec', to: 'subagents', label: 'if AgentTool', dashed: true },
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
  // Scene — Memory System (07-memory)
  // ─────────────────────────────────────────────
  {
    id: 'memory-system',
    title: 'Memory System',
    crumb: 'Memory',
    boxes: [
      {
        id: 'extraction',
        label: 'Extraction',
        sublabel: 'write side · stop hooks',
        x: 18, y: 35,
        variant: 'amber',
        detail: { contentKey: 'memory-system/extraction', defaultPanel: 0 },
      },
      {
        id: 'memory-files',
        label: 'Memory Files',
        sublabel: '~/.claude/.../memory/',
        x: 50, y: 35,
        detail: { contentKey: 'memory-system/memory-files' },
      },
      {
        id: 'prefetch',
        label: 'Prefetch',
        sublabel: 'read side · Sonnet selects',
        x: 82, y: 35,
        variant: 'blue',
        detail: { contentKey: 'memory-system/prefetch', defaultPanel: 0 },
      },
      {
        id: 'session-memory',
        label: 'Session Memory',
        sublabel: 'per-session · feeds compaction',
        x: 50, y: 75,
        variant: 'ghost',
        detail: { contentKey: 'memory-system/session-memory', defaultPanel: 0 },
      },
      {
        id: 'prompt-cache',
        label: 'Prompt Cache',
        sublabel: 'prefix-based · 0.1× on hits',
        x: 18, y: 75,
        variant: 'blue',
        detail: { contentKey: 'background-calls/cache', defaultPanel: 0 },
      },
    ],
    arrows: [
      { from: 'extraction',    to: 'memory-files', label: 'writes' },
      { from: 'memory-files',  to: 'prefetch',     label: 'reads' },
      { from: 'extraction',    to: 'prompt-cache', dashed: true },
    ],
    regions: [
      {
        label: 'Long-term Memory',
        boxes: ['extraction', 'memory-files', 'prefetch'],
        padding: 32,
        color: '#52525b',
        labelAlign: 'center',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene — AgentTool (10-agents)
  // ─────────────────────────────────────────────
  {
    id: 'agent-tool',
    title: 'AgentTool — Subagent Architecture',
    crumb: 'AgentTool',
    hideDiagramTab: true,
    panels: [
      { label: 'Illustration', animation: 'agent-tool-flow' },
    ],
    boxes: [
      {
        id: 'entry',
        label: 'AgentTool',
        sublabel: 'single entry point',
        x: 50, y: 8,
        description: 'AgentTool is the single entry point for all subagent spawning. Its call() resolves the agent type, decides sync vs async, then launches a new query loop.',
      },
      {
        id: 'fork',
        label: 'Fork Agent',
        sublabel: 'no subagent_type · inherits parent',
        x: 24, y: 30,
        variant: 'blue',
        detail: { contentKey: 'agent-tool/fork' },
      },
      {
        id: 'named',
        label: 'Named Agent',
        sublabel: 'subagent_type set · AgentDefinition',
        x: 76, y: 30,
        variant: 'green',
        detail: { contentKey: 'agent-tool/named' },
      },
      {
        id: 'agent-types',
        label: 'Agent Types',
        sublabel: 'built-in · custom · plugin',
        x: 76, y: 52,
        variant: 'yellow',
        detail: { contentKey: 'agent-tool/agent-types' },
      },
      {
        id: 'when-to-fork',
        label: 'When to Fork',
        sublabel: 'decision criteria',
        x: 24, y: 52,
        variant: 'amber',
        detail: { contentKey: 'agent-tool/when-to-fork' },
      },
      {
        id: 'context',
        label: 'Context Inheritance',
        sublabel: 'createSubagentContext()',
        x: 24, y: 72,
        detail: { contentKey: 'agent-tool/context' },
      },
      {
        id: 'isolation',
        label: 'Isolation Mode',
        sublabel: 'default · worktree · remote',
        x: 76, y: 72,
        detail: { contentKey: 'agent-tool/isolation' },
      },
    ],
    arrows: [
      { from: 'entry',  to: 'fork',      label: 'no subagent_type' },
      { from: 'entry',  to: 'named',     label: 'subagent_type set' },
      { from: 'fork',   to: 'when-to-fork' },
      { from: 'fork',   to: 'context',   label: 'inherits parent' },
      { from: 'fork',   to: 'isolation' },
      { from: 'named',  to: 'agent-types' },
      { from: 'named',  to: 'isolation' },
    ],
    regions: [
      {
        label: 'Agent Type',
        boxes: ['fork', 'named'],
        padding: 24,
        color: '#52525b',
      },
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
        label: 'Incoming Calls',
        sublabel: 'from model response',
        x: 50, y: 12,
        dashed: true,
        description: 'When the model decides to use a tool, it returns one or more tool blocks in its response. Each block has a tool name, a unique ID, and the input the model wants to pass.',
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
    ],
    regions: [
      {
        label: 'Execution Mode',
        boxes: ['streaming', 'batch'],
        padding: 24,
        color: '#52525b',
      },
    ],
    sideSteps: [
      { y: 36, fromBoxId: 'batch',     text: `**Which mode?**\n- Streaming starts tools mid-stream\n- Batch waits for the full response\n- Only one runs per turn` },
      { y: 60, fromBoxId: 'partition', text: `**Which can run together?**\n- Concurrent-safe tools run in parallel\n- Bash gets exclusive access` },
      { y: 84, fromBoxId: 'per-tool',  text: `**Execute each tool**\n- Permission check\n- Execution\n- Result formatting` },
    ],
  },

  // ─────────────────────────────────────────────
  // Scene — Home / Navigation Hub
  // ─────────────────────────────────────────────
  {
    id: 'home',
    title: 'Claude Code — Internals',
    crumb: 'Home',
    boxes: [
      {
        id: 'nav-arch',
        label: 'Architecture Flow',
        sublabel: 'CLI → QueryEngine → result',
        x: 50, y: 14,
        navigateTo: 'architecture-flow',
      },
      {
        id: 'nav-qe',
        label: 'QueryEngine',
        sublabel: 'per-turn orchestration',
        x: 26, y: 42,
        variant: 'amber',
        navigateTo: 'query-engine-detail',
      },
      {
        id: 'nav-ql',
        label: 'Query Loop',
        sublabel: 'query.ts · while(true)',
        x: 74, y: 42,
        variant: 'amber',
        navigateTo: 'query-loop-detail',
      },
      {
        id: 'nav-compact',
        label: 'Compaction',
        sublabel: 'message pre-processing',
        x: 20, y: 74,
        variant: 'yellow',
        navigateTo: 'compaction-pipeline',
      },
      {
        id: 'nav-tools',
        label: 'Tool Execution',
        sublabel: 'runTools() pipeline',
        x: 50, y: 74,
        variant: 'blue',
        navigateTo: 'tool-execution-pipeline',
      },
      {
        id: 'nav-agent',
        label: 'AgentTool',
        sublabel: 'subagent spawning',
        x: 80, y: 74,
        variant: 'green',
        navigateTo: 'agent-tool',
      },
    ],
    arrows: [
      { from: 'nav-arch',    to: 'nav-qe' },
      { from: 'nav-arch',    to: 'nav-ql' },
      { from: 'nav-qe',      to: 'nav-ql' },
      { from: 'nav-ql',      to: 'nav-compact', label: 'pre-process' },
      { from: 'nav-ql',      to: 'nav-tools',   label: 'tool calls' },
      { from: 'nav-tools',   to: 'nav-agent',   label: 'AgentTool' },
    ],
  },
]
