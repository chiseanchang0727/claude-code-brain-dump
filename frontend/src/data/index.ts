import { scenes as staticScenes } from './scenes'
import overrides from './positions.json'

type PositionOverrides = Record<string, Record<string, { x: number; y: number }>>

const pos = overrides as PositionOverrides

export const scenes = staticScenes.map(scene => ({
  ...scene,
  boxes: scene.boxes.map(box => ({
    ...box,
    ...(pos[scene.id]?.[box.id] ?? {}),
  })),
}))
