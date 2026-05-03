export interface DetailDef {
  contentKey: string  // maps to src/content/{contentKey}.md
  defaultPanel?: number
}

export type BoxVariant = 'default' | 'green' | 'yellow' | 'amber' | 'red' | 'ghost' | 'blue'

export interface BoxDef {
  id: string
  label: string
  sublabel?: string
  description?: string  // short text shown in a chat bubble on click
  x: number             // % from left
  y: number             // % from top
  variant?: BoxVariant
  detail?: DetailDef
  navigateTo?: string
  elevated?: boolean    // render above the SVG arrow/region layer
}

export interface ArrowDef {
  from: string
  to: string
  label?: string
  dashed?: boolean
  curved?: boolean   // draws a bezier arc instead of straight line
  color?: string
}

export interface RegionDef {
  label: string
  boxes: string[]   // box IDs to encompass
  padding?: number  // px padding around the group
  color?: string    // stroke + label color, defaults to zinc
  labelAlign?: 'left' | 'center'
}

export interface PanelDiagram {
  boxes: BoxDef[]
  arrows: ArrowDef[]
  regions?: RegionDef[]
  height?: number
}

export interface PanelDef {
  label: string
  contentKey?: string
  diagram?: PanelDiagram
  animation?: 'async-generator' | 'transcript' | 'microcompact' | 'snip' | 'context-collapse' | 'autocompact' | 'flow-overview' | 'per-tool' | 'streaming-executor' | 'concurrency-partition'
  layout?: 'split'
}

export interface SceneDef {
  id: string
  title: string
  crumb: string
  boxes: BoxDef[]
  arrows: ArrowDef[]
  regions?: RegionDef[]
  panels?: PanelDef[]
  hideDiagramTab?: boolean  // hides the Diagram tab; diagram code is preserved
}

export type HistoryItem =
  | { type: 'scene';   idx: number;      crumb: string }
  | { type: 'content'; contentKey: string; crumb: string; defaultPanel?: number }
