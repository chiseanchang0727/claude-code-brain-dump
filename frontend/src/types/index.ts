export interface DetailDef {
  contentKey: string  // maps to src/content/{contentKey}.md
}

export type BoxVariant = 'default' | 'green' | 'yellow' | 'amber' | 'red'

export interface BoxDef {
  id: string
  label: string
  sublabel?: string
  x: number          // % from left
  y: number          // % from top
  variant?: BoxVariant
  detail?: DetailDef
  navigateTo?: string  // scene id — click navigates instead of opening detail
}

export interface ArrowDef {
  from: string
  to: string
  label?: string
  dashed?: boolean
  curved?: boolean   // draws a bezier arc instead of straight line
}

export interface SceneDef {
  id: string
  title: string
  crumb: string
  boxes: BoxDef[]
  arrows: ArrowDef[]
}

export type HistoryItem =
  | { type: 'scene';   idx: number;      crumb: string }
  | { type: 'content'; contentKey: string; crumb: string }
