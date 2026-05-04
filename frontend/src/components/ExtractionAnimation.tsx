import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'p1-trigger', 'p1-write', 'p2-trigger', 'p2-fork', 'p2-done'] as const
const PHASE_DURATIONS = [600, 2500, 3000, 2500, 3000, 3000]

export function ExtractionAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx   = PHASES.indexOf(phase)
  const showP1     = phaseIdx >= PHASES.indexOf('p1-trigger')
  const showP1Done = phaseIdx >= PHASES.indexOf('p1-write')
  const showP2     = phaseIdx >= PHASES.indexOf('p2-trigger')
  const showP2Fork = phaseIdx >= PHASES.indexOf('p2-fork')
  const showP2Done = phaseIdx >= PHASES.indexOf('p2-done')

  const memFilesActive = showP1Done || showP2Done

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      {/* Path 1 — Direct */}
      <div className="min-h-[80px]">
        <AnimatePresence>
          {showP1 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-2.5">
              <div className="text-[10px] text-zinc-500 font-mono mb-1">path 1 — user-initiated</div>
              <div className="text-xs text-amber-300 font-mono">&gt; remember this</div>
              <AnimatePresence>
                {showP1Done && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[10px] text-zinc-400 mt-1.5">
                    main agent writes directly · no forked agent
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Path 2 — Auto */}
      <div className="min-h-[96px]">
        <AnimatePresence>
          {showP2 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5">
              <div className="text-[10px] text-zinc-500 font-mono mb-1">path 2 — auto-extraction</div>
              <div className="text-xs text-zinc-300">query loop ended</div>
              <AnimatePresence>
                {showP2Fork && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-2 space-y-1">
                    <div className="text-[10px] text-zinc-500 font-mono">stop hook 7b fires</div>
                    <div className="text-[10px] text-zinc-500 font-mono">↓ runForkedAgent()</div>
                    <div className="text-[10px] text-blue-400 font-mono">  shares parent prompt cache</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memory files output */}
      <AnimatePresence>
        {memFilesActive && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-green-800 bg-green-950/40 px-4 py-2.5">
            <div className="text-[10px] text-zinc-500 font-mono mb-1">~/.claude/.../memory/</div>
            <div className="flex gap-2 flex-wrap">
              {['user_role.md', 'feedback_tests.md', 'project_auth.md'].map(f => (
                <span key={f} className="text-[10px] font-mono text-green-400 border border-green-900 bg-green-950/60 px-1.5 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="min-h-[44px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">two write paths, mutually exclusive per turn</motion.p>
          )}
          {phase === 'p1-trigger' && (
            <motion.p key="p1t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">user explicitly asks to save a memory</motion.p>
          )}
          {phase === 'p1-write' && (
            <motion.p key="p1w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">if path 1 ran this turn, path 2 is skipped entirely</motion.p>
          )}
          {phase === 'p2-trigger' && (
            <motion.p key="p2t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">automatic — fires at the end of every query loop</motion.p>
          )}
          {phase === 'p2-fork' && (
            <motion.p key="p2f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">forked agent can only edit files in the memory directory</motion.p>
          )}
          {phase === 'p2-done' && (
            <motion.p key="p2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">memories written · "memory saved" injected into main conversation</motion.p>
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
