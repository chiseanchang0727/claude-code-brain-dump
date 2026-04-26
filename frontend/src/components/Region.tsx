import { motion } from 'framer-motion'
import type { RegionDef, BoxDef } from '../types'

interface Props {
  region: RegionDef
  boxes: BoxDef[]
  containerSize: { width: number; height: number }
}

const BOX_HW = 82
const BOX_HH = 30

export function Region({ region, boxes, containerSize }: Props) {
  const { width: w, height: h } = containerSize
  if (w === 0) return null

  const targets = boxes.filter(b => region.boxes.includes(b.id))
  if (targets.length === 0) return null

  const pad = region.padding ?? 24

  const xs = targets.map(b => (b.x / 100) * w)
  const ys = targets.map(b => (b.y / 100) * h)

  const x1 = Math.min(...xs) - BOX_HW - pad
  const y1 = Math.min(...ys) - BOX_HH - pad
  const x2 = Math.max(...xs) + BOX_HW + pad
  const y2 = Math.max(...ys) + BOX_HH + pad

  const rx = 14

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <rect
        x={x1} y={y1}
        width={x2 - x1} height={y2 - y1}
        rx={rx}
        fill="none"
        stroke={region.color ?? '#52525b'}
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      <text
        x={x1 + 12}
        y={y2 + 14}
        fill={region.color ?? '#71717a'}
        fontSize="11"
        fontWeight="500"
      >
        {region.label}
      </text>
    </motion.g>
  )
}
