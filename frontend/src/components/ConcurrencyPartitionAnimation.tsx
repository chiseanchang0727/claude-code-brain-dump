import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'label', 'group', 'batch1', 'batch2', 'batch3', 'done'] as const
const PHASE_DURATIONS = [600, 2200, 2000, 2500, 2500, 2500, 3000]

type Phase = typeof PHASES[number]

const TOOLS = [
  { id: 1, name: 'Read',  safe: true,  batch: 1 },
  { id: 2, name: 'Read',  safe: true,  batch: 1 },
  { id: 3, name: 'Bash',  safe: false, batch: 2 },
  { id: 4, name: 'Read',  safe: true,  batch: 3 },
  { id: 5, name: 'Read',  safe: true,  batch: 3 },
]

const BATCHES = [
  { num: 1, ids: [1, 2], label: 'parallel', color: 'border-blue-700 bg-blue-950/40' },
  { num: 2, ids: [3],    label: 'alone',    color: 'border-amber-700 bg-amber-950/40' },
  { num: 3, ids: [4, 5], label: 'parallel', color: 'border-blue-700 bg-blue-950/40' },
]

function toolCard(
  tool: typeof TOOLS[number],
  phase: Phase,
  activeBatch: number | null,
  doneBatches: number[],
) {
  const showLabel  = PHASES.indexOf(phase) >= PHASES.indexOf('label')
  const showGroup  = PHASES.indexOf(phase) >= PHASES.indexOf('group')
  const isRunning  = activeBatch === tool.batch
  const isDone     = doneBatches.includes(tool.batch)
  const isInactive = activeBatch !== null && !isRunning && !isDone

  return (
    <motion.div
      key={tool.id}
      layout
      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors duration-300 ${
        isDone    ? 'border-green-700 bg-green-950/40 opacity-60' :
        isRunning ? 'border-amber-500 bg-amber-950/60' :
        isInactive ? 'opacity-40 border-zinc-700 bg-zinc-900' :
        tool.safe ? 'border-zinc-600 bg-zinc-800/60' :
                   'border-amber-800 bg-amber-950/30'
      }`}
    >
      <span className={`text-xs font-semibold font-mono ${
        isDone ? 'text-green-400' : isRunning ? 'text-amber-300' : 'text-zinc-200'
      }`}>
        {isDone ? '✓' : isRunning ? '⟳' : ''} {tool.name}
      </span>
      <AnimatePresence>
        {showLabel && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`text-[9px] font-mono ${tool.safe ? 'text-blue-400' : 'text-amber-400'}`}
          >
            {tool.safe ? 'concurrent' : 'exclusive'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ConcurrencyPartitionAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx   = PHASES.indexOf(phase)
  const showGroup  = phaseIdx >= PHASES.indexOf('group')
  const activeBatch =
    phase === 'batch1' ? 1 :
    phase === 'batch2' ? 2 :
    phase === 'batch3' ? 3 : null
  const doneBatches =
    phase === 'batch2' ? [1] :
    phase === 'batch3' ? [1, 2] :
    phase === 'done'   ? [1, 2, 3] : []

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      {/* Input strip */}
      <div>
        <div className="text-[10px] text-zinc-600 font-mono mb-2">incoming tool calls</div>
        <div className="flex gap-2 justify-center">
          {TOOLS.map(tool => toolCard(tool, phase, activeBatch, doneBatches))}
        </div>
      </div>

      {/* Partition arrow */}
      <AnimatePresence>
        {showGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-0.5 py-1"
          >
            <div className="w-px h-3 bg-zinc-700" />
            <div className="text-zinc-600 text-[10px] font-mono">partitionToolCalls()</div>
            <div className="w-px h-3 bg-zinc-700" />
            <div className="text-zinc-600 text-sm">↓</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batches */}
      <AnimatePresence>
        {showGroup && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            {BATCHES.map(batch => {
              const isActive = activeBatch === batch.num
              const isDone   = doneBatches.includes(batch.num)
              const tools    = TOOLS.filter(t => batch.ids.includes(t.id))
              return (
                <div
                  key={batch.num}
                  className={`flex-1 rounded-xl border-2 px-3 py-2.5 transition-colors duration-300 ${
                    isDone   ? 'border-green-800 bg-green-950/30 opacity-50' :
                    isActive ? batch.color :
                               'border-zinc-700 bg-zinc-900/40'
                  }`}
                >
                  <div className="text-[9px] font-mono text-zinc-600 mb-2">
                    batch {batch.num} · {batch.label}
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {tools.map(t => (
                      <span key={t.id} className={`text-xs font-mono font-semibold ${
                        isDone   ? 'text-green-500' :
                        isActive ? 'text-white' :
                                   'text-zinc-500'
                      }`}>
                        {isDone ? '✓' : ''}{t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="min-h-[44px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">
              5 tool calls waiting
            </motion.p>
          )}
          {phase === 'label' && (
            <motion.p key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              <span className="text-blue-400">concurrent</span> tools can run in parallel ·{' '}
              <span className="text-amber-400">exclusive</span> tools run alone
            </motion.p>
          )}
          {phase === 'group' && (
            <motion.p key="group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              grouped into 3 batches — executed in order
            </motion.p>
          )}
          {phase === 'batch1' && (
            <motion.p key="b1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-amber-400 text-xs">
              batch 1 running — Read + Read in parallel
            </motion.p>
          )}
          {phase === 'batch2' && (
            <motion.p key="b2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-amber-400 text-xs">
              batch 2 running — Bash alone (may modify shared state)
            </motion.p>
          )}
          {phase === 'batch3' && (
            <motion.p key="b3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-amber-400 text-xs">
              batch 3 running — Read + Read in parallel
            </motion.p>
          )}
          {phase === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-green-800 bg-green-950/50 px-3 py-2 text-xs text-green-400">
              all 5 tool results ready
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <button onClick={() => setAutoPlay(!autoPlay)} className="text-zinc-500 hover:text-white text-xs transition-colors">
          {autoPlay ? '⏸' : '▶'}
        </button>
        <div className="flex gap-3">
          <button onClick={prev}  className="text-zinc-500 hover:text-white text-xs transition-colors">← back</button>
          <button onClick={next}  className="text-zinc-500 hover:text-white text-xs transition-colors">next →</button>
          <button onClick={reset} className="text-zinc-500 hover:text-white text-xs transition-colors">↺</button>
        </div>
      </div>
    </div>
  )
}
