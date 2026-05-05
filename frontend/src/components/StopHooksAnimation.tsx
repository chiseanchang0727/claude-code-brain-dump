import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'bg-tasks', 'stop-hooks-wait', 'stop-hooks-result', 'done'] as const
const PHASE_DURATIONS = [600, 3500, 3000, 3500, 2500]

type Section = 'stophooks' | 'done' | null

function getSection(phase: string): Section {
  if (['bg-tasks', 'stop-hooks-wait', 'stop-hooks-result'].includes(phase)) return 'stophooks'
  if (phase === 'done') return 'done'
  return null
}

const BG_TASKS = [
  { name: 'promptSuggestion()', label: 'suggest follow-up prompts' },
  { name: 'extractMemories()',  label: 'save facts to memory files' },
  { name: 'autoDream()',        label: 'consolidate memories'       },
]

export function StopHooksAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const section = getSection(phase)

  return (
    <div key={cycle} className="h-full flex flex-col py-6 px-4 gap-4">

      {/* Entry label */}
      <div className="shrink-0 text-[10px] font-mono text-zinc-600">
        model returned · no tool calls · !needsFollowUp branch
      </div>

      {/* Step pills */}
      <div className="flex gap-2 shrink-0">
        {[
          { key: 'stophooks', label: '7b — stop hooks' },
          { key: 'done',      label: '7d — end_turn'   },
        ].map(s => (
          <div key={s.key} className={`text-[10px] font-mono px-2 py-1 rounded border transition-all duration-300 ${
            section === s.key
              ? 'border-zinc-600 bg-zinc-800/50 text-zinc-300'
              : 'border-zinc-800/50 text-zinc-700'
          }`}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">

          {/* ── Stop hooks ── */}
          {section === 'stophooks' && (
            <motion.div key="stophooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-4">

              {/* Fire-and-forget */}
              <div>
                <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-wide mb-2">fire-and-forget</div>
                <div className="space-y-2">
                  {BG_TASKS.map((t, i) => (
                    <motion.div key={t.name}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: phase === 'bg-tasks' ? 1 : 0.25, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-600 font-mono w-6 shrink-0">void</span>
                      <span className="text-[10px] font-mono text-zinc-400 w-36 shrink-0">{t.name}</span>
                      <div className="flex-1 border-t border-dashed border-zinc-800" />
                      <span className="text-[9px] text-zinc-600 shrink-0">{t.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* User-defined stop hooks */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-wide mb-2">awaited</div>
                <div className={`rounded-lg border px-3 py-2.5 transition-colors duration-300 ${
                  phase === 'stop-hooks-wait' || phase === 'stop-hooks-result'
                    ? 'border-amber-800 bg-amber-950/20'
                    : 'border-zinc-800 bg-zinc-900/20 opacity-40'
                }`}>
                  <div className="text-[10px] font-mono text-zinc-300 mb-2">await executeStopHooks()</div>
                  <AnimatePresence mode="wait">
                    {phase === 'stop-hooks-wait' && (
                      <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-1 text-[9px]">
                        <div className="text-zinc-500">yields: progress · attachments · blocking errors</div>
                        <div className="text-zinc-600">user shell commands running…</div>
                      </motion.div>
                    )}
                    {phase === 'stop-hooks-result' && (
                      <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-1.5">
                        <div className="flex items-start gap-2 text-[9px]">
                          <span className="text-amber-400 font-mono w-32 shrink-0">blockingErrors</span>
                          <span className="text-zinc-500">inject into conversation → model fixes</span>
                        </div>
                        <div className="flex items-start gap-2 text-[9px]">
                          <span className="text-amber-400 font-mono w-32 shrink-0">preventContinuation</span>
                          <span className="text-zinc-500">stop here, don't let model continue</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Done ── */}
          {section === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3">
              <div className="border border-green-800 bg-green-950/20 rounded px-3 py-2 text-[10px] font-mono text-green-400">
                return · reason: end_turn
              </div>
              <span className="text-[10px] text-zinc-600">loop exits</span>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Status */}
      <div className="min-h-[36px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">four sub-steps when the model produces no tool calls</motion.p>
          )}
          {phase === 'bg-tasks' && (
            <motion.p key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">7b — three background tasks fire immediately, <span className="text-zinc-300">main loop doesn't wait</span></motion.p>
          )}
          {phase === 'stop-hooks-wait' && (
            <motion.p key="sw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">user-defined stop hooks are <span className="text-amber-400">awaited</span> — they can block or modify the conversation</motion.p>
          )}
          {phase === 'stop-hooks-result' && (
            <motion.p key="sr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">the result decides whether the loop continues or exits</motion.p>
          )}
          {phase === 'done' && (
            <motion.p key="dn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">7d — loop exits with <span className="text-green-400">end_turn</span></motion.p>
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
