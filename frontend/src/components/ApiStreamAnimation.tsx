import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'stream-text', 'stream-tool', 'error-hold', 'error-release', 'fallback-demand', 'fallback-switch'] as const
const PHASE_DURATIONS = [600, 3000, 3500, 3000, 4000, 2500, 4000]

type Scenario = 'streaming' | 'error' | 'fallback'

function getScenario(phase: string): Scenario | null {
  if (['stream-text', 'stream-tool'].includes(phase)) return 'streaming'
  if (['error-hold', 'error-release'].includes(phase)) return 'error'
  if (['fallback-demand', 'fallback-switch'].includes(phase)) return 'fallback'
  return null
}

export function ApiStreamAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const scenario = getScenario(phase)
  const streamActive = ['stream-text', 'stream-tool', 'error-hold', 'fallback-demand', 'fallback-switch'].includes(phase)
  const streamDone = phase === 'error-release'
  const isErrorHeld = phase === 'error-hold'
  const isErrorRelease = phase === 'error-release'
  const isFallbackDemand = phase === 'fallback-demand'
  const isFallbackSwitch = phase === 'fallback-switch'

  return (
    <div key={cycle} className="h-full flex flex-col py-6 px-4 gap-4">

      {/* Scenario pills — always visible, one highlighted */}
      <div className="flex gap-2 shrink-0">
        {(['streaming', 'error', 'fallback'] as Scenario[]).map(s => (
          <div key={s} className={`text-[10px] font-mono px-2 py-1 rounded border transition-all duration-300 ${
            scenario === s
              ? s === 'streaming' ? 'border-zinc-600 bg-zinc-800/50 text-zinc-300'
              : s === 'error'     ? 'border-orange-800 bg-orange-950/30 text-orange-400'
              :                     'border-blue-800 bg-blue-950/30 text-blue-400'
              : 'border-zinc-800/50 text-zinc-700'
          }`}>
            {s === 'streaming' ? 'normal streaming' : s === 'error' ? 'withheld error' : 'fallback model'}
          </div>
        ))}
      </div>

      {/* Stream backbone — always visible */}
      <div className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
        <div className="text-[9px] text-zinc-600 font-mono mb-2 uppercase tracking-wide">SSE stream</div>
        <div className="flex items-center gap-2">

          {/* Source */}
          <div className="shrink-0">
            <div className={`text-[10px] font-mono border rounded px-2 py-0.5 transition-all duration-500 ${
              isFallbackSwitch ? 'border-zinc-800 text-zinc-700' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}>
              {scenario === 'fallback' ? 'primary' : 'model'}
            </div>
            <AnimatePresence>
              {isFallbackSwitch && (
                <motion.div key="fb" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-[10px] font-mono border border-blue-800 bg-blue-950/30 rounded px-2 py-0.5 text-blue-400">
                  fallback
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stream line with chunk dots */}
          <div className="flex-1 flex items-center gap-1.5">
            <div className="h-px bg-zinc-800 w-2 shrink-0" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                !streamActive && !streamDone ? 'bg-zinc-800'
                : isErrorHeld && i === 2     ? 'bg-orange-500'
                : streamDone                 ? 'bg-zinc-700'
                : 'bg-zinc-500'
              }`} />
            ))}
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* message_stop */}
          <div className={`shrink-0 text-[10px] font-mono border rounded px-2 py-0.5 transition-all duration-300 ${
            streamDone ? 'border-zinc-600 bg-zinc-800/50 text-zinc-300' : 'border-zinc-800 text-zinc-600'
          }`}>
            stop
          </div>
        </div>

        {/* Inline annotations on the backbone */}
        <AnimatePresence>
          {isErrorHeld && (
            <motion.div key="err-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-2 flex justify-center">
              <span className="text-[9px] font-mono border border-orange-800 bg-orange-950/20 rounded px-2 py-0.5 text-orange-400">
                error arrived mid-stream — held ⚠ — stream continues
              </span>
            </motion.div>
          )}
          {isFallbackSwitch && (
            <motion.div key="fb-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-2 flex justify-center">
              <span className="text-[9px] font-mono border border-blue-800 bg-blue-950/20 rounded px-2 py-0.5 text-blue-400">
                silent switch — caller never notified
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scenario detail */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">

          {scenario === 'streaming' && (
            <motion.div key="streaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-2.5">

              <div className="flex items-center gap-3 pl-3 border-l-2 border-green-800">
                <span className="text-[10px] font-mono text-zinc-500 w-16 shrink-0">text_delta</span>
                <span className="text-[10px] text-zinc-600">→</span>
                <span className="text-[10px] text-green-400">yielded to UI in real time</span>
              </div>

              <div className="flex items-center gap-3 pl-3 border-l-2 border-amber-800">
                <span className="text-[10px] font-mono text-zinc-500 w-16 shrink-0">tool_use</span>
                <span className="text-[10px] text-zinc-600">→</span>
                <span className="text-[10px] text-amber-400">collected until complete</span>
              </div>

              <AnimatePresence>
                {phase === 'stream-tool' && (
                  <motion.div key="exec" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="ml-[76px] rounded border border-blue-800 bg-blue-950/20 px-3 py-2">
                    <div className="text-[10px] text-blue-300">streaming executor: tool starts before model finishes</div>
                    <div className="text-[9px] text-zinc-600 mt-0.5">model still generating · tool already running</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {scenario === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <AnimatePresence mode="wait">
                {isErrorHeld && (
                  <motion.div key="held" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-zinc-500">
                    error is buffered internally — the stream continues undisturbed
                  </motion.div>
                )}
                {isErrorRelease && (
                  <motion.div key="release" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2">
                    <div className="text-[10px] text-zinc-500 mb-3">after stream — error triggers recovery:</div>
                    {[
                      { err: '413 context too long', rec: 'compact → retry' },
                      { err: 'max output tokens',    rec: 'escalate to 64K → resume' },
                      { err: 'media size limit',     rec: 'strip media → compact → retry' },
                    ].map(r => (
                      <div key={r.err} className="flex items-start gap-2">
                        <span className="text-[10px] text-orange-400 font-mono w-32 shrink-0">{r.err}</span>
                        <span className="text-[10px] text-zinc-600">→</span>
                        <span className="text-[10px] text-zinc-400">{r.rec}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {scenario === 'fallback' && (
            <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-2">
              <AnimatePresence mode="wait">
                {isFallbackDemand && (
                  <motion.div key="demand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-zinc-500">
                    primary model under high demand — response may not arrive
                  </motion.div>
                )}
                {isFallbackSwitch && (
                  <motion.div key="switch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-zinc-600">primary messages</span>
                      <span className="border border-red-900 bg-red-950/20 rounded px-1.5 py-0.5 text-red-400">tombstoned</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-zinc-400">fallback responds normally</span>
                      <span className="text-green-400">✓ seamless</span>
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-1">caller never sees the switch</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Status */}
      <div className="min-h-[36px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">three things that can happen during a streaming API call</motion.p>
          )}
          {phase === 'stream-text' && (
            <motion.p key="st" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs"><span className="text-green-400">text deltas</span> flow to the UI in real time as they arrive</motion.p>
          )}
          {phase === 'stream-tool' && (
            <motion.p key="stl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">tool calls are collected — the streaming executor may start them before the model finishes</motion.p>
          )}
          {phase === 'error-hold' && (
            <motion.p key="eh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">certain errors are <span className="text-orange-400">held back</span> — the stream is not interrupted</motion.p>
          )}
          {phase === 'error-release' && (
            <motion.p key="er" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">after message_stop, held errors trigger their recovery path</motion.p>
          )}
          {phase === 'fallback-demand' && (
            <motion.p key="fd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">under high demand, the response may come from a fallback model</motion.p>
          )}
          {phase === 'fallback-switch' && (
            <motion.p key="fs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">primary tombstoned — retried against fallback — caller never sees the switch</motion.p>
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
