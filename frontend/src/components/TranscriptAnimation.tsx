import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

type Mode = 'build' | 'branch'

const NODE_W = 112
const NODE_H = 46
const NODE_HW = NODE_W / 2
const NODE_HH = NODE_H / 2
const ZINC   = '#52525b'
const AMBER  = '#b45309'

interface NodeSpec { id: string; label: string; sub: string; cx: number; cy: number; amber?: boolean }
interface ArrowSpec { from: string; to: string; label?: string; amber?: boolean; labelSide?: 'left' | 'right' }

const BUILD_NODES: NodeSpec[] = [
  { id: 'n1', label: 'user',        sub: 'uuid: a1f2..', cx: 0.15, cy: 0.22 },
  { id: 'n2', label: 'assistant',   sub: 'uuid: b3e4..', cx: 0.37, cy: 0.22 },
  { id: 'n3', label: 'tool_use',    sub: 'uuid: c5d6..', cx: 0.59, cy: 0.22 },
  { id: 'n4', label: 'tool_result', sub: 'uuid: d7f8..', cx: 0.81, cy: 0.22 },
]
const BUILD_ARROWS: ArrowSpec[] = [
  { from: 'n1', to: 'n2', label: 'parent: a1f2..' },
  { from: 'n2', to: 'n3', label: 'parent: b3e4..' },
  { from: 'n3', to: 'n4', label: 'parent: c5d6..' },
]

const BRANCH_NODES: NodeSpec[] = [
  { id: 'm1', label: 'user',              sub: 'uuid: a1f2..', cx: 0.12, cy: 0.28 },
  { id: 'm2', label: 'call_subagent',     sub: 'uuid: b3e4..', cx: 0.34, cy: 0.28, amber: true },
  { id: 'm3', label: 'tool_result',       sub: 'uuid: e9a0..', cx: 0.58, cy: 0.28 },
  { id: 'm4', label: 'assistant',         sub: 'uuid: f1b2..', cx: 0.80, cy: 0.28 },
  { id: 's1', label: 'subagent · asst',   sub: 'uuid: g3c4..', cx: 0.34, cy: 0.74, amber: true },
  { id: 's2', label: 'subagent · asst',   sub: 'uuid: g3c4..', cx: 0.58, cy: 0.74, amber: true },
  { id: 's3', label: 'subagent · result', sub: 'uuid: h5d6..', cx: 0.80, cy: 0.74, amber: true },
]
const BRANCH_ARROWS: ArrowSpec[] = [
  { from: 'm1', to: 'm2' },
  { from: 'm2', to: 'm3', label: 'same parentUuid' },
  { from: 'm3', to: 'm4' },
  { from: 'm2', to: 's1', amber: true, label: 'same parentUuid', labelSide: 'left' },
  { from: 's1', to: 's2', amber: true },
  { from: 's2', to: 's3', amber: true },
]

const HISTORY_MSGS = [
  { role: '{"role":"user"...',       amber: false },
  { role: '{"role":"assistant"...', amber: false },
  { role: '{"role":"assistant"...', amber: false },
  { role: '{"role":"tool_use"...',  amber: false },
]

const BUILD_HISTORY_MSGS = [
  { line: '{"role":"user","uuid":"a1f2.."}',                            amber: false },
  { line: '{"role":"assistant","uuid":"b3e4..","parentUuid":"a1f2.."}', amber: false },
  { line: '{"role":"tool_use","uuid":"c5d6..","parentUuid":"b3e4.."}',  amber: false  },
  { line: '{"role":"tool_result","uuid":"d7f8..","parentUuid":"c5d6.."}', amber: false },
]

// steps: 0=blank, 1=arrow0 anim, 2=arrow1 anim, 3=arrow2 anim, 4=all static pause
const BUILD_STEP_DURATIONS = [400, 900, 900, 900, 1600]

function regionRect(ids: string[], nodes: NodeSpec[], W: number, H: number, pad: number) {
  const targets = nodes.filter(n => ids.includes(n.id))
  const xs = targets.map(n => n.cx * W)
  const ys = targets.map(n => n.cy * H)
  return {
    x1: Math.min(...xs) - NODE_HW - pad,
    y1: Math.min(...ys) - NODE_HH - pad,
    x2: Math.max(...xs) + NODE_HW + pad,
    y2: Math.max(...ys) + NODE_HH + pad,
  }
}

function arrowPoints(from: NodeSpec, to: NodeSpec, W: number, H: number) {
  const fx = from.cx * W, fy = from.cy * H
  const tx = to.cx * W,   ty = to.cy * H
  const dx = tx - fx, dy = ty - fy
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x1: fx + Math.sign(dx) * NODE_HW, y1: fy, x2: tx - Math.sign(dx) * NODE_HW, y2: ty }
  }
  return { x1: fx, y1: fy + Math.sign(dy) * NODE_HH, x2: tx, y2: ty - Math.sign(dy) * NODE_HH }
}

interface Props {
  onOpenContent?: (contentKey: string, crumb: string, defaultPanel?: number) => void
}

export function TranscriptAnimation({ onOpenContent }: Props) {
  const [mode, setMode] = useState<Mode>('build')
  const containerRef = useRef<HTMLDivElement>(null)
  const branchHistoryBoxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [branchHistoryRect, setBranchHistoryRect] = useState<{ top: number; bottom: number; cx: number; right: number } | null>(null)
  const [buildStep, setBuildStep] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Build: step through arrows one by one, revealing JSONL lines
  useEffect(() => {
    if (mode !== 'build') { setBuildStep(0); return }
    const tid = setTimeout(() => setBuildStep(s => (s + 1) % 5), BUILD_STEP_DURATIONS[buildStep])
    return () => clearTimeout(tid)
  }, [mode, buildStep])


  const measureBranchHistoryBox = useCallback(() => {
    const container = containerRef.current
    const box = branchHistoryBoxRef.current
    if (!container || !box) { setBranchHistoryRect(null); return }
    const cr = container.getBoundingClientRect()
    const br = box.getBoundingClientRect()
    setBranchHistoryRect({
      top:    br.top    - cr.top,
      bottom: br.bottom - cr.top,
      cx:     br.left   - cr.left + br.width / 2,
      right:  br.right  - cr.left,
    })
  }, [])

  useEffect(() => {
    if (mode !== 'branch') { setBranchHistoryRect(null); return }
    measureBranchHistoryBox()
    const obs = new ResizeObserver(measureBranchHistoryBox)
    if (branchHistoryBoxRef.current) obs.observe(branchHistoryBoxRef.current)
    return () => obs.disconnect()
  }, [mode, size, measureBranchHistoryBox])

  const nodes  = mode === 'build' ? BUILD_NODES : BRANCH_NODES
  const arrows = mode === 'build' ? BUILD_ARROWS : BRANCH_ARROWS
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const { width: W, height: H } = size

  const allXs = nodes.map(n => n.cx * W)
  const allYs = nodes.map(n => n.cy * H)
  const pad = 22
  const bx1 = Math.min(...allXs) - NODE_HW - pad
  const by1 = Math.min(...allYs) - NODE_HH - pad
  const bx2 = Math.max(...allXs) + NODE_HW + pad
  const by2 = Math.max(...allYs) + NODE_HH + pad

  const mainRegion = W > 0 ? regionRect(['m1','m2','m3','m4'], nodes, W, H, 18) : null
  const sideRegion = W > 0 ? regionRect(['s1','s2','s3'],      nodes, W, H, 18) : null

  const m2 = BRANCH_NODES.find(n => n.id === 'm2')!
  const s1 = BRANCH_NODES.find(n => n.id === 's1')!
  const branchHistoryTop = ((m2.cy + s1.cy) / 2) * H

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Mode toggle */}
      <div className="absolute top-3 left-4 z-10 flex gap-1.5">
        {([['build', '○─○  Build'], ['branch', '⑂  Branch']] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
              mode === m
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {W > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            <defs>
              <marker id="ta-z" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill={ZINC} />
              </marker>
              <marker id="ta-a" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill={AMBER} />
              </marker>
            </defs>

            {mode === 'build' && (
              <>
                <rect x={bx1} y={by1} width={bx2 - bx1} height={by2 - by1}
                  rx={10} fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeDasharray="5 4" />
                <text x={bx1 + 10} y={by1 - 7} fontSize="11" fill="#ffffff" fontWeight="bold">
                  transcript.jsonl — append only, never rewritten
                </text>
              </>
            )}

            {mode === 'branch' && mainRegion && sideRegion && (
              <>
                <rect x={mainRegion.x1} y={mainRegion.y1}
                  width={mainRegion.x2 - mainRegion.x1} height={mainRegion.y2 - mainRegion.y1}
                  rx={10} fill="none" stroke="#ecf00a" strokeWidth="1.5" strokeDasharray="5 4" />
                <text x={mainRegion.x1 + 10} y={mainRegion.y1 - 7} fontSize="11" fill="#ecf00a" fontWeight="500">
                  main transcript
                </text>
                <rect x={sideRegion.x1} y={sideRegion.y1}
                  width={sideRegion.x2 - sideRegion.x1} height={sideRegion.y2 - sideRegion.y1}
                  rx={10} fill="none" stroke="#16e5ec" strokeWidth="1.5" strokeDasharray="5 4" />
                <text x={sideRegion.x1 + 10} y={sideRegion.y2 + 16} fontSize="11" fill="#16e5ec" fontWeight="500">
                  sidechain transcript
                </text>
              </>
            )}

            {arrows.map((a, i) => {
              const fn = nodeMap.get(a.from), tn = nodeMap.get(a.to)
              if (!fn || !tn) return null
              const { x1, y1, x2, y2 } = arrowPoints(fn, tn, W, H)
              const color = a.amber ? AMBER : ZINC
              const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
              const markerId = a.amber ? 'ta-a' : 'ta-z'

              if (mode === 'build') {
                // hide future arrows; animate current; show past as static
                if (buildStep === 0 || i >= buildStep) return null
                const isActive = i === buildStep - 1
                return (
                  <g key={`${a.from}-${a.to}`}>
                    {isActive ? (
                      <motion.line
                        key={buildStep}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={color} strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.75, ease: 'easeInOut' }}
                        markerEnd={`url(#${markerId})`}
                      />
                    ) : (
                      <line x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={color} strokeWidth="1.5" markerEnd={`url(#${markerId})`} />
                    )}
                    {a.label && !isActive && (
                      <text x={mid.x} y={mid.y - 6} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="bold">
                        {a.label}
                      </text>
                    )}
                  </g>
                )
              }

              return (
                <g key={`${a.from}-${a.to}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color} strokeWidth="1.5" markerEnd={`url(#${markerId})`} />
                  {a.label && (
                    <text
                      x={a.labelSide === 'left' ? mid.x - 8 : mid.x}
                      y={mid.y - 6}
                      textAnchor={a.labelSide === 'left' ? 'end' : 'middle'}
                      fontSize="11" fill="#ffffff" fontWeight="bold"
                    >
                      {a.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {nodes.map(n => (
            <div
              key={n.id}
              className={`absolute text-center rounded-lg border px-2 py-2 ${
                n.amber
                  ? 'bg-orange-950/60 border-orange-800 text-orange-100'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-100'
              }`}
              style={{ left: n.cx * W, top: n.cy * H, transform: 'translate(-50%, -50%)', width: NODE_W }}
            >
              <div className="text-xs font-semibold leading-tight">{n.label}</div>
              <div className={`text-[10px] font-mono mt-0.5 ${n.amber ? 'text-orange-500' : 'text-zinc-500'}`}>
                {n.sub}
              </div>
            </div>
          ))}

          {mode === 'build' && (
            <div
              className="absolute border border-dashed border-zinc-600 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
              style={{
                left: (bx1 + bx2) / 2,
                top: (by2 + H) / 2,
                transform: 'translate(-50%, -50%)',
                minWidth: 320,
              }}
            >
              <div className="text-sm text-white font-medium mb-0.5 text-center">Transcript</div>
              {BUILD_HISTORY_MSGS.slice(0, Math.min(buildStep, BUILD_HISTORY_MSGS.length)).map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded px-3 py-1 text-[10px] font-mono border ${
                    msg.amber
                      ? 'bg-orange-950/50 border-orange-800/60 text-orange-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {msg.line}
                </motion.div>
              ))}
            </div>
          )}

          {mode === 'branch' && (
            <div
              ref={branchHistoryBoxRef}
              className="absolute border border-dashed border-zinc-600 rounded-xl px-2 py-2 flex flex-col gap-1"
              style={{
                left: m2.cx * W + 14,
                top: branchHistoryTop,
                transform: 'translateY(-50%)',
                minWidth: 130,
              }}
            >
              <div className="text-[10px] text-zinc-500 font-medium mb-0.5 text-center">full conversation history</div>
              {HISTORY_MSGS.map((msg, i) => (
                <div
                  key={i}
                  className="rounded px-2 py-0.5 text-[10px] font-mono border bg-zinc-800 border-zinc-700 text-zinc-300"
                >
                  {msg.role}
                </div>
              ))}
            </div>
          )}

          {mode === 'branch' && branchHistoryRect && (
            <div
              className="absolute text-[11px] text-white font-bold leading-relaxed"
              style={{
                left: branchHistoryRect.right + 12,
                top: (branchHistoryRect.top + branchHistoryRect.bottom) / 2,
                transform: 'translateY(-50%)',
                maxWidth: W - branchHistoryRect.right - 20,
              }}
            >
              All-or-nothing — no selective message picking.<br />
              - Unknown agent type: full parent history inherited.<br />
              - Known agent type: task prompt only.
            </div>
          )}
        </>
      )}
    </div>
  )
}
