import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'p1-trigger', 'p1-write', 'or', 'p2-trigger', 'p2-fork', 'p2-done'] as const
const PHASE_DURATIONS = [2000, 3000, 4000, 3000, 3000, 5000, 6000]

export function ExtractionAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx   = PHASES.indexOf(phase)
  const showP1     = phaseIdx >= PHASES.indexOf('p1-trigger') && phaseIdx < PHASES.indexOf('or')
  const showP1Done = phase === 'p1-write'
  const showOr     = phase === 'or'
  const showP2     = phaseIdx >= PHASES.indexOf('p2-trigger')
  const showP2Fork = phaseIdx >= PHASES.indexOf('p2-fork')
  const showP2Done = phase === 'p2-done'

  const memFilesActive = showP1Done || showP2Done

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      {/* Active path — only one shown at a time */}
      <div className="min-h-[110px]">
        <AnimatePresence mode="wait">
          {showP1 && (
            <motion.div key="path1"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3">
              <div className="text-[10px] text-zinc-500 font-mono mb-2">path 1 — user-initiated</div>
              <div className="text-xs text-amber-300 font-mono mb-2">&gt; remember this</div>
              <AnimatePresence>
                {showP1Done && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-zinc-400">
                    main agent writes directly · no background agent
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {showOr && (
            <motion.div key="or"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center h-[110px]">
              <span className="text-zinc-300 text-sm font-mono tracking-widest">— or —</span>
            </motion.div>
          )}

          {showP2 && (
            <motion.div key="path2"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3">
              <div className="text-[10px] text-zinc-500 font-mono mb-2">path 2 — automatic</div>
              <div className="flex flex-col">
                {/* Step 1 */}
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1" />
                    <div className="w-px bg-zinc-700 flex-1 min-h-[20px]" />
                  </div>
                  <span className="text-xs text-zinc-300 pb-3">model finishes responding</span>
                </div>

                <AnimatePresence>
                  {showP2Fork && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
                      {/* Step 2 */}
                      <div className="flex gap-3 items-start">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1" />
                          <div className="w-px bg-zinc-700 flex-1 min-h-[20px]" />
                        </div>
                        <div className="pb-3">
                          <div className="text-xs text-zinc-300">background agent reviews recent messages</div>
                          <div className="text-[10px] text-blue-300 mt-0.5 pl-2">↳ reuses parent's cached context — cheap</div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-3 items-start">
                        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1" />
                        <span className="text-xs text-zinc-300">writes memories to disk</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Memory files output */}
      <div className="min-h-[64px]">
        <AnimatePresence>
          {memFilesActive && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
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
      </div>

      {/* Status */}
      <div className="min-h-[44px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">two write paths — only one runs per turn</motion.p>
          )}
          {phase === 'p1-trigger' && (
            <motion.p key="p1t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">user explicitly asks to save a memory</motion.p>
          )}
          {phase === 'p1-write' && (
            <motion.p key="p1w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">path 2 is skipped this turn — they never both run</motion.p>
          )}
          {phase === 'or' && (
            <motion.p key="or" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">mutually exclusive — only one path per turn</motion.p>
          )}
          {phase === 'p2-trigger' && (
            <motion.p key="p2t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">fires automatically after every model response</motion.p>
          )}
          {phase === 'p2-fork' && (
            <motion.p key="p2f" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">background agent can only write to the memory directory</motion.p>
          )}
          {phase === 'p2-done' && (
            <motion.p key="p2d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">memories written · "memory saved" notice injected into conversation</motion.p>
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
