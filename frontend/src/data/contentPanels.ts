import type { PanelDef } from '../types'

export const contentPanels: Record<string, PanelDef[]> = {
  'query-engine-detail/transcript-file': [
    { label: 'Visualization', animation: 'transcript' },
  ],
  'compaction-pipeline/microcompact': [
    { label: 'Illustration', animation: 'microcompact', layout: 'split' },
  ],
  'compaction-pipeline/snip': [
    { label: 'Illustration', animation: 'snip', layout: 'split' },
  ],
  'compaction-pipeline/context-collapse': [
    { label: 'Illustration', animation: 'context-collapse', layout: 'split' },
  ],
  'compaction-pipeline/autocompact': [
    { label: 'Illustration', animation: 'autocompact', layout: 'split' },
  ],
  'tool-execution-pipeline/per-tool': [
    { label: 'Illustration', animation: 'per-tool', layout: 'split' },
  ],
  'query-loop-detail/api-stream': [
    { label: 'Illustration', animation: 'api-stream', layout: 'split' },
  ],
  'query-loop-detail/stop-hooks': [
    { label: 'Illustration', animation: 'stop-hooks', layout: 'split' },
  ],
  'agent-tool/context': [
    { label: 'Illustration', animation: 'context-inheritance' },
  ],
  'architecture-flow/system-prompt': [
    { label: 'Illustration', animation: 'system-prompt', layout: 'split' },
  ],
  'background-calls/cache': [
    { label: 'Illustration', animation: 'cache', layout: 'split' },
  ],
  'memory-system/extraction': [
    { label: 'Illustration', animation: 'extraction', layout: 'split' },
  ],
  'memory-system/prefetch': [
    { label: 'Illustration', animation: 'prefetch', layout: 'split' },
  ],
  'query-engine-detail/understand': [
    { label: 'Illustration', animation: 'understand', layout: 'split' },
  ],
  'query-engine-detail/tools': [
    { label: 'Illustration', animation: 'tools', layout: 'split' },
  ],
  'tool-execution-pipeline/streaming': [
    { label: 'Illustration', animation: 'streaming-executor', layout: 'split' },
  ],
  'tool-execution-pipeline/partition': [
    { label: 'Illustration', animation: 'concurrency-partition', layout: 'split' },
  ],
}
