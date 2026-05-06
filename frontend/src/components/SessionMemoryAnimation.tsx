import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'gates', 'bg-write', 'fills', 'compact-hit', 'payoff'] as const
const PHASE_DURATIONS = [800, 3000, 3000, 2000, 3000, 4500]

function phaseIdx(phase: string) {
  return PHASES.indexOf(phase as typeof PHASES[number])
}

export function SessionMemoryAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const idx = phaseIdx(phase)

  const showGates    = idx >= phaseIdx('gates')
  const showFile     = idx >= phaseIdx('bg-write')
  const showFills    = idx >= phaseIdx('fills')
  const showCompact  = idx >= phaseIdx('compact-hit')

  return (
    <div key={cycle} className="h-full flex flex-col py-5 px-5 gap-4 max-w-sm mx-auto w-full">

      {/* Background update loop */}
      <div className="shrink-0 flex flex-col gap-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">background loop — every N tool calls</div>

        {/* Gates */}
        <AnimatePresence>
          {showGates && (
            <motion.div key="gates" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded border border-zinc-700 bg-zinc-800/30 px-3 py-2 space-y-1">
              {[
                { label: 'init threshold', val: '12k tokens', note: '≥ 10k' },
                { label: 'token growth',   val: '6k since last', note: '≥ 5k' },
                { label: 'tool calls',     val: '3 since last', note: '≥ 3' },
              ].map((g, i) => (
                <motion.div key={g.label} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2">
                  <span className="text-green-400 text-xs shrink-0">✓</span>
                  <span className="text-[11px] font-mono text-zinc-400 w-24 shrink-0">{g.label}</span>
                  <span className="text-[11px] text-zinc-300">{g.val}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{g.note}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fork → file */}
        <AnimatePresence>
          {showFile && (
            <motion.div key="fork" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2">
              <div className="text-[11px] font-mono border border-zinc-600 bg-zinc-800/50 text-zinc-300 rounded px-2 py-1">
                fork agent
                <span className="text-zinc-600 ml-1.5 text-[10px]">FileEdit only</span>
              </div>
              <span className="text-zinc-600 text-xs">→</span>
              <div className="flex-1 rounded border border-green-800 bg-green-950/30 px-2 py-1">
                <div className="text-[11px] font-mono text-green-300">session-memory.md</div>
                <div className="text-[10px] text-green-700 mt-0.5">updated ✓</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="shrink-0 border-t border-zinc-800" />

      {/* Compaction path */}
      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">when context fills up</div>

        {/* Context bar */}
        <AnimatePresence>
          {showFills && (
            <motion.div key="bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <div className="text-[11px] text-zinc-400">context window</div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div className="h-full bg-amber-600 rounded-full"
                  initial={{ width: '60%' }} animate={{ width: '92%' }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }} />
              </div>
              <div className="text-[10px] text-zinc-600">autocompact triggers</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compaction hit — three-stage flow */}
        <AnimatePresence>
          {showCompact && (
            <motion.div key="compact" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-0">

              {[
                { step: '1', label: 'wait',   sub: 'up to 15s for any in-flight extraction', color: 'border-amber-800 bg-amber-950/20 text-amber-300' },
                { step: '2', label: 'read',   sub: 'session-memory.md', color: 'border-zinc-600 bg-zinc-800/40 text-zinc-200' },
                { step: '3', label: 'inject', sub: 'use as compact summary', color: 'border-green-800 bg-green-950/20 text-green-300' },
              ].map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}>
                  <div className={`rounded border px-3 py-1.5 flex items-center gap-2 ${s.color}`}>
                    <span className="text-[10px] opacity-50 shrink-0">{s.step}</span>
                    <span className="text-[11px] font-mono">{s.label}</span>
                    <span className="text-[10px] opacity-60 ml-1">{s.sub}</span>
                  </div>
                  {i < 2 && <div className="text-zinc-700 text-[10px] pl-3 leading-none">↓</div>}
                </motion.div>
              ))}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="pl-3 mt-1 border-l border-dashed border-zinc-700 ml-2">
                <div className="text-[10px] text-zinc-600">fallback if file is empty → fork agent + API call</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Status */}
      <div className="min-h-[36px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">pre-computing the compaction summary incrementally throughout the session</motion.p>
          )}
          {phase === 'gates' && (
            <motion.p key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">gates prevent over-updating — session memory writes are sequential, one at a time</motion.p>
          )}
          {phase === 'bg-write' && (
            <motion.p key="bw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">forked agent has one allowed action: <span className="font-mono text-zinc-200">FileEdit</span> on the exact session memory path — nothing else</motion.p>
          )}
          {phase === 'fills' && (
            <motion.p key="f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">context fills up — autocompact triggers and looks for a compaction strategy</motion.p>
          )}
          {phase === 'compact-hit' && (
            <motion.p key="ch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">waits up to 15s for any in-progress extraction, then reads the file — already maintained, no API call needed</motion.p>
          )}
          {phase === 'payoff' && (
            <motion.p key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">pre-computing the summary throughout the session means compaction costs nothing when the moment comes</motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 shrink-0">
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
