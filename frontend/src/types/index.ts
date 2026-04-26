export interface DetailDef {
  contentKey: string  // maps to src/content/{contentKey}.md
}

export type BoxVariant = 'default' | 'green' | 'yellow' | 'amber' | 'red' | 'ghost'

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
  contentKey: string
  diagram?: PanelDiagram
  animation?: 'async-generator'
}

export interface SceneDef {
  id: string
  title: string
  crumb: string
  boxes: BoxDef[]
  arrows: ArrowDef[]
  regions?: RegionDef[]
  panels?: PanelDef[]
}

export type HistoryItem =
  | { type: 'scene';   idx: number;      crumb: string }
  | { type: 'content'; contentKey: string; crumb: string }
