import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'static-blocks', 'tools', 'boundary', 'dynamic-blocks', 'messages'] as const
const PHASE_DURATIONS = [1000, 3500, 3000, 3000, 3000, 4000]

function phaseIndex(phase: string) {
  return PHASES.indexOf(phase as typeof PHASES[number])
}

export function SystemPromptAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const idx = phaseIndex(phase)

  const showStatic   = idx >= phaseIndex('static-blocks')
  const showTools    = idx >= phaseIndex('tools')
  const showBoundary = idx >= phaseIndex('boundary')
  const showDynamic  = idx >= phaseIndex('dynamic-blocks')
  const showMessages = idx >= phaseIndex('messages')

  return (
    <div key={cycle} className="h-full flex flex-col py-5 px-6 gap-4 max-w-sm mx-auto w-full">

      {/* Header */}
      <div className="shrink-0">
        <div className="text-xs text-zinc-500 font-mono">fetchSystemPromptParts()</div>
        <div className="text-xs text-zinc-600 mt-0.5">called once per user turn, before the query loop</div>
      </div>

      {/* Tiers */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">

        {/* System prompt blocks */}
        <AnimatePresence>
          {showStatic && (
            <motion.div key="sp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">system prompt blocks</div>

              {[
                { label: 'Base instructions', sublabel: 'core Claude Code prompt · ~40k tokens · pre-warmed by Anthropic', large: true },
                { label: 'Model config',      sublabel: 'model-specific rules & constraints' },
              ].map((b, i) => (
                <motion.div key={b.label}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className={`rounded border border-zinc-600 bg-zinc-800/60 px-3 ${b.large ? 'py-3' : 'py-2'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-zinc-300">{b.label}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{b.sublabel}</div>
                    </div>
                    <AnimatePresence>
                      {showBoundary && (
                        <motion.span key="marker" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          className="text-[10px] font-mono bg-green-950 border border-green-700 text-green-400 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                          cache_control
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}

              {/* Tool schemas — cached, before boundary */}
              <AnimatePresence>
                {showTools && (
                  <motion.div key="tools" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded border border-zinc-600 bg-zinc-800/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono text-zinc-300">Tool schemas</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">descriptions + input schemas</div>
                      </div>
                      <AnimatePresence>
                        {showBoundary && (
                          <motion.span key="marker" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="text-[10px] font-mono bg-green-950 border border-green-700 text-green-400 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                            cache_control
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SYSTEM_PROMPT_DYNAMIC_BOUNDARY */}
              <AnimatePresence>
                {showBoundary && (
                  <motion.div key="boundary"
                    initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="flex items-center gap-2 my-0.5 origin-left">
                    <div className="flex-1 border-t border-dashed border-green-700" />
                    <span className="text-[10px] font-mono text-green-600 shrink-0">cache prefix</span>
                    <div className="w-2 border-t border-dashed border-green-700" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dynamic blocks */}
              <AnimatePresence>
                {showDynamic && (
                  <motion.div key="dyn" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded border border-zinc-700 bg-zinc-800/30 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono text-zinc-500">Dynamic blocks</div>
                        <div className="text-[11px] text-zinc-600 mt-0.5">git status · memory · session context</div>
                      </div>
                      <span className="text-[10px] font-mono text-red-700 shrink-0">not cached</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence>
          {showMessages && (
            <motion.div key="msg-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wide">messages</div>
              <div className="rounded border border-zinc-700 bg-zinc-800/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-zinc-400">Conversation history</div>
                    <div className="text-[11px] text-zinc-600 mt-0.5">one marker on last message · grows each turn</div>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-950 border border-blue-700 text-blue-400 rounded px-1.5 py-0.5 whitespace-nowrap shrink-0">
                    cache_control
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Status */}
      <div className="min-h-[40px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">three cache layers per API call — system prompt, tools, messages</motion.p>
          )}
          {phase === 'static-blocks' && (
            <motion.p key="sb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">static blocks are identical for every Claude Code user — base instructions and model config never change between sessions</motion.p>
          )}
          {phase === 'tools' && (
            <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">tool schemas are stable across turns — they sit alongside the static blocks as part of the cached prefix</motion.p>
          )}
          {phase === 'boundary' && (
            <motion.p key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs"><span className="text-green-400">cache prefix</span> ends here — everything above is stable and cached. Anthropic pre-warms it; your first call is already a hit.</motion.p>
          )}
          {phase === 'dynamic-blocks' && (
            <motion.p key="db" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">dynamic blocks change per session — git status, injected memory, MCP server prompts. No marker; never cached.</motion.p>
          )}
          {phase === 'messages' && (
            <motion.p key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">one marker on the last message caches the conversation history prefix — each turn you pay full price only for new messages; everything before is a cache read at 0.1×</motion.p>
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
