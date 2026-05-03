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
  'tool-execution-pipeline/streaming': [
    { label: 'Illustration', animation: 'streaming-executor', layout: 'split' },
  ],
  'tool-execution-pipeline/partition': [
    { label: 'Illustration', animation: 'concurrency-partition', layout: 'split' },
  ],
}
