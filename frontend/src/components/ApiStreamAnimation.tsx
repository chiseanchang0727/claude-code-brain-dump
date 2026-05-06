import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'stream-text', 'stream-chunks', 'stream-deltas', 'stream-tool', 'error-hold', 'error-release', 'fallback-demand', 'fallback-switch'] as const
const PHASE_DURATIONS = [600, 2500, 4000, 3500, 3500, 3000, 4000, 2500, 4000]

const CHUNKS = ['The ', 'answer ', 'is ', '42']

type Scenario = 'streaming' | 'error' | 'fallback'

function getScenario(phase: string): Scenario | null {
  if (['stream-text', 'stream-chunks', 'stream-deltas', 'stream-tool'].includes(phase)) return 'streaming'
  if (['error-hold', 'error-release'].includes(phase)) return 'error'
  if (['fallback-demand', 'fallback-switch'].includes(phase)) return 'fallback'
  return null
}

const DELTA_TYPES = [
  { type: 'text_delta',      builds: "assistant's text response" },
  { type: 'thinking_delta',  builds: 'thinking block content' },
  { type: 'signature_delta', builds: 'thinking block signature' },
]

export function ApiStreamAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const scenario = getScenario(phase)
  const [visibleChunks, setVisibleChunks] = useState(0)

  useEffect(() => {
    setVisibleChunks(0)
    if (phase !== 'stream-chunks') return
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleChunks(i)
      if (i >= CHUNKS.length) clearInterval(interval)
    }, 600)
    return () => clearInterval(interval)
  }, [phase])

  const streamActive = ['stream-text', 'stream-chunks', 'stream-deltas', 'stream-tool', 'error-hold', 'fallback-demand', 'fallback-switch'].includes(phase)
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
          <div key={s} className={`text-xs font-mono px-2 py-1 rounded border transition-all duration-300 ${
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
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide">SSE stream</div>
          <AnimatePresence>
            {isFallbackSwitch && (
              <motion.div key="fb" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                className="text-[10px] font-mono border border-blue-800 bg-blue-950/30 rounded px-1.5 py-0.5 text-blue-400">
                primary → fallback
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SSE event sequence */}
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { id: 'msg_start', label: 'message_start' },
            { id: 'cb_start',  label: 'content_block_start' },
            { id: 'delta',     label: 'content_block_delta', note: '×N' },
            { id: 'cb_stop',   label: 'content_block_stop' },
            { id: 'msg_stop',  label: 'message_stop' },
          ] as { id: string; label: string; note?: string }[]).map((evt, i, arr) => {
            let cls = 'border-zinc-700 text-zinc-600'
            if (streamActive || streamDone) {
              if (evt.id === 'delta') {
                if (isErrorHeld)
                  cls = 'border-orange-800 bg-orange-950/20 text-orange-400'
                else if (['stream-text', 'stream-chunks', 'stream-deltas', 'stream-tool'].includes(phase))
                  cls = 'border-zinc-400 bg-zinc-800/70 text-zinc-100'
                else
                  cls = 'border-zinc-600 text-zinc-400'
              } else if (evt.id === 'msg_stop') {
                cls = (streamDone || isFallbackSwitch)
                  ? 'border-zinc-500 bg-zinc-800/50 text-zinc-200'
                  : 'border-zinc-700 text-zinc-500'
              } else {
                cls = 'border-zinc-600 bg-zinc-800/40 text-zinc-300'
              }
            }
            return (
              <div key={evt.id} className="flex items-center gap-1">
                <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 whitespace-nowrap transition-all duration-300 ${cls}`}>
                  {evt.label}
                  {evt.note && <span className="text-[9px] opacity-60 ml-1">{evt.note}</span>}
                </span>
                {i < arr.length - 1 && <span className="text-zinc-600 text-[9px]">→</span>}
              </div>
            )
          })}
        </div>

        {/* Inline annotations */}
        <AnimatePresence>
          {isErrorHeld && (
            <motion.div key="err-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-2">
              <span className="text-[10px] font-mono border border-orange-800 bg-orange-950/20 rounded px-1.5 py-0.5 text-orange-400">
                error arrived mid-stream — held ⚠ — stream continues
              </span>
            </motion.div>
          )}
          {isFallbackSwitch && (
            <motion.div key="fb-badge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-2">
              <span className="text-[10px] font-mono border border-blue-800 bg-blue-950/20 rounded px-1.5 py-0.5 text-blue-400">
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
              className="space-y-3">

              {/* stream-text: intro */}
              {phase === 'stream-text' && (
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-500">model streams token by token — each chunk arrives as a <span className="font-mono text-zinc-300">text_delta</span></div>
                  <div className="text-xs font-mono text-zinc-600">contentBlock.text += delta.text</div>
                </div>
              )}

              {/* stream-chunks: live accumulation */}
              {phase === 'stream-chunks' && (
                <div className="space-y-2">
                  <div className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 space-y-1">
                    {CHUNKS.slice(0, visibleChunks).map((chunk, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-600 shrink-0">text_delta</span>
                        <span className="text-xs text-zinc-700">→</span>
                        <span className="text-xs font-mono text-green-400">"{chunk}"</span>
                      </motion.div>
                    ))}
                  </div>
                  {visibleChunks > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-xs font-mono text-zinc-400 px-1">
                      accumulated: "<span className="text-green-400">{CHUNKS.slice(0, visibleChunks).join('')}</span>"
                    </motion.div>
                  )}
                </div>
              )}

              {/* stream-deltas: delta types table */}
              {phase === 'stream-deltas' && (
                <div className="space-y-1.5">
                  <div className="text-xs text-zinc-600 mb-2">all follow the same accumulate-until-stop pattern:</div>
                  {DELTA_TYPES.map((d, i) => (
                    <motion.div key={d.type} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-300 w-32 shrink-0">{d.type}</span>
                      <span className="text-xs text-zinc-700">→</span>
                      <span className="text-xs text-zinc-500">{d.builds}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* stream-tool */}
              {phase === 'stream-tool' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 pl-3 border-l-2 border-amber-800">
                    <span className="text-xs font-mono text-zinc-500 w-24 shrink-0">tool_call</span>
                    <span className="text-xs text-zinc-600">→</span>
                    <span className="text-xs text-amber-400">collected until complete</span>
                  </div>
                  <motion.div key="exec" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded border border-blue-800 bg-blue-950/20 px-3 py-2">
                    <div className="text-xs text-blue-300">streaming executor polls after every event</div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">tool may start before model finishes generating</div>
                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {scenario === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <AnimatePresence mode="wait">
                {isErrorHeld && (
                  <motion.div key="held" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs text-zinc-500">
                    error is buffered internally — the stream continues undisturbed
                  </motion.div>
                )}
                {isErrorRelease && (
                  <motion.div key="release" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2">
                    <div className="text-xs text-zinc-400 mb-2">after stream — error triggers recovery:</div>
                    <div className="space-y-1.5">
                      {[
                        { err: '413 context too long', rec: 'compact → retry' },
                        { err: 'max output tokens',    rec: 'escalate to 64K → resume' },
                        { err: 'media size limit',     rec: 'strip media → compact → retry' },
                      ].map(r => (
                        <div key={r.err} className="pl-2.5 border-l-2 border-orange-800">
                          <div className="text-xs font-mono text-orange-400">{r.err}</div>
                          <div className="text-[11px] text-zinc-300 mt-0.5">↳ {r.rec}</div>
                        </div>
                      ))}
                    </div>
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
                    className="text-xs text-zinc-500">
                    primary model under high demand — response may not arrive
                  </motion.div>
                )}
                {isFallbackSwitch && (
                  <motion.div key="switch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-zinc-600">primary messages</span>
                      <span className="border border-red-900 bg-red-950/20 rounded px-1.5 py-0.5 text-red-400">tombstoned</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-zinc-400">fallback responds normally</span>
                      <span className="text-green-400">✓ seamless</span>
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-1">caller never sees the switch</div>
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
              className="text-zinc-400 text-xs">the model doesn't send the full response at once — it streams token by token as each chunk is generated</motion.p>
          )}
          {phase === 'stream-chunks' && (
            <motion.p key="sc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">each <span className="text-green-400 font-mono">text_delta</span> appends to the in-progress block — like watching someone type in real time</motion.p>
          )}
          {phase === 'stream-deltas' && (
            <motion.p key="sd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">four delta types, same pattern — accumulate chunks until <span className="font-mono text-zinc-300">content_block_stop</span> arrives</motion.p>
          )}
          {phase === 'stream-tool' && (
            <motion.p key="stl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">tool input streams as <span className="text-amber-400 font-mono">input_json_delta</span> — executor polls after every event and may start before the model finishes</motion.p>
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
