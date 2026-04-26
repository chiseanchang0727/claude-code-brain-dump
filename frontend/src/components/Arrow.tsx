import { motion } from 'framer-motion'
import type { ArrowDef, BoxDef } from '../types'
import { theme } from '../theme'

interface Props {
  arrow: ArrowDef
  boxes: BoxDef[]
  containerSize: { width: number; height: number }
}

// Half-dimensions of the box (w-40 = 160px → half 80, height ~56px → half 28)
const BOX_HW = 82  // half-width, slightly padded
const BOX_HH = 30  // half-height, slightly padded

function getCenter(box: BoxDef, w: number, h: number) {
  return { x: (box.x / 100) * w, y: (box.y / 100) * h }
}

// Finds where the line from `from` toward `to` exits the rectangular boundary of `from`.
function offsetToEdge(from: {x:number,y:number}, to: {x:number,y:number}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len
  const ny = dy / len
  // t = how far along the ray we travel to hit each wall; take the nearer wall
  const tx = Math.abs(nx) > 0.001 ? BOX_HW / Math.abs(nx) : Infinity
  const ty = Math.abs(ny) > 0.001 ? BOX_HH / Math.abs(ny) : Infinity
  const t = Math.min(tx, ty)
  return {
    x1: from.x + nx * t,
    y1: from.y + ny * t,
    x2: to.x - nx * t,
    y2: to.y - ny * t,
  }
}

export function Arrow({ arrow, boxes, containerSize }: Props) {
  const { width: w, height: h } = containerSize
  const fromBox = boxes.find(b => b.id === arrow.from)
  const toBox = boxes.find(b => b.id === arrow.to)
  if (!fromBox || !toBox || w === 0) return null

  const from = getCenter(fromBox, w, h)
  const to = getCenter(toBox, w, h)
  const markerId = `arrow-${arrow.from}-${arrow.to}`
  const color = theme.arrow.color

  let pathD: string
  let midX: number
  let midY: number

  if (arrow.curved) {
    // quadratic bezier curving left/below the boxes
    const { x1, y1, x2, y2 } = offsetToEdge(from, to)
    const cx = Math.min(x1, x2) - 60
    const cy = (y1 + y2) / 2
    pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
    midX = (x1 + 2 * cx + x2) / 4
    midY = (y1 + 2 * cy + y2) / 4
  } else {
    const { x1, y1, x2, y2 } = offsetToEdge(from, to)
    pathD = `M ${x1} ${y1} L ${x2} ${y2}`
    midX = (x1 + x2) / 2
    midY = (y1 + y2) / 2
  }

  return (
    <g>
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      <motion.path
        d={pathD}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray={arrow.dashed ? '5 4' : undefined}
        markerEnd={`url(#${markerId})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: 'easeInOut' }}
      />
      {arrow.label && (
        <motion.text
          x={midX}
          y={midY - 7}
          textAnchor="middle"
          fill="#71717a"
          fontSize="10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {arrow.label}
        </motion.text>
      )}
    </g>
  )
}
