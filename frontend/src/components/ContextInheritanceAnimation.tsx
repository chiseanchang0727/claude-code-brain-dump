import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'parent-convo', 'fork-spawn', 'inherit-messages', 'inherit-cache', 'fork-runs'] as const
const PHASE_DURATIONS = [600, 2500, 2000, 3000, 3000, 4000]

const PARENT_MESSAGES = [
  { role: 'user',      text: 'user message'       },
  { role: 'assistant', text: 'assistant response'  },
  { role: 'user',      text: 'user message'        },
  { role: 'assistant', text: 'assistant response'  },
]

const INHERITED = [
  { label: 'messages',            value: '4 turns of history',        color: 'text-blue-400'  },
  { label: 'renderedSystemPrompt',value: 'threaded from parent',       color: 'text-zinc-400'  },
  { label: 'fileStateCache',      value: 'cloned',                     color: 'text-zinc-400'  },
]

export function ContextInheritanceAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const showParent    = ['parent-convo', 'fork-spawn', 'inherit-messages', 'inherit-cache', 'fork-runs'].includes(phase)
  const showFork      = ['fork-spawn', 'inherit-messages', 'inherit-cache', 'fork-runs'].includes(phase)
  const showInherit   = ['inherit-messages', 'inherit-cache', 'fork-runs'].includes(phase)
  const showCache     = ['inherit-cache', 'fork-runs'].includes(phase)
  const showForkRuns  = phase === 'fork-runs'

  return (
    <div key={cycle} className="h-full flex flex-col py-6 px-4 gap-4">

      {/* Parent conversation */}
      <div className={`shrink-0 rounded-lg border px-4 py-3 transition-all duration-500 ${
        showParent ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/20 opacity-30'
      }`}>
        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wide mb-2">parent query loop</div>
        <div className="space-y-1">
          {PARENT_MESSAGES.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-[9px] font-mono w-16 shrink-0 ${m.role === 'user' ? 'text-zinc-500' : 'text-green-500'}`}>
                {m.role}
              </span>
              <div className={`h-1.5 rounded-full transition-all duration-500 ${
                showParent ? (m.role === 'user' ? 'bg-zinc-700' : 'bg-green-900') : 'bg-zinc-800'
              }`} style={{ width: m.role === 'user' ? '40%' : '60%' }} />
            </div>
          ))}
        </div>
        <AnimatePresence>
          {showCache && (
            <motion.div key="cache" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 pt-2 border-t border-zinc-800 flex items-center gap-2">
              <span className="text-[9px] font-mono text-zinc-600">prompt cache</span>
              <div className="flex-1 h-1.5 rounded-full bg-blue-900/60" />
              <span className="text-[9px] text-blue-400 font-mono">cached</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Arrow + spawn label */}
      <AnimatePresence>
        {showFork && (
          <motion.div key="arrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="shrink-0 flex flex-col items-center gap-0.5">
            <div className="w-px h-3 bg-zinc-700" />
            <span className="text-[9px] font-mono text-zinc-500">AgentTool → fork</span>
            <div className="w-px h-3 bg-zinc-700" />
            <div className="text-zinc-700 text-[10px]">↓</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fork agent */}
      <AnimatePresence>
        {showFork && (
          <motion.div key="fork" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-lg border border-blue-800 bg-blue-950/20 px-4 py-3">
            <div className="text-[9px] text-blue-400 font-mono uppercase tracking-wide mb-2">fork agent — new query loop</div>

            {/* Inherited fields */}
            <AnimatePresence>
              {showInherit && (
                <motion.div key="inherited" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="space-y-1.5 mb-2">
                  {INHERITED.map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-zinc-600 w-36 shrink-0">{item.label}</span>
                      <span className={`text-[9px] ${item.color}`}>{item.value}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cache hit */}
            <AnimatePresence>
              {showCache && (
                <motion.div key="cachehit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 pt-2 border-t border-blue-900/50">
                  <span className="text-[9px] font-mono text-zinc-600">prompt cache</span>
                  <div className="flex-1 h-1.5 rounded-full bg-blue-900/60" />
                  <span className="text-[9px] text-green-400 font-mono">HIT 0.1×</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Running */}
            <AnimatePresence>
              {showForkRuns && (
                <motion.div key="running" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 pt-2 border-t border-blue-900/50 space-y-1">
                  <div className="text-[9px] text-zinc-500">allowed tools: Read · Grep · Glob · Write (memory dir only)</div>
                  <div className="text-[9px] text-zinc-600">runs in background · parent loop continues</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <div className="min-h-[36px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">fork agents inherit context from the parent query loop</motion.p>
          )}
          {phase === 'parent-convo' && (
            <motion.p key="pc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">parent has a full conversation history and a warm prompt cache</motion.p>
          )}
          {phase === 'fork-spawn' && (
            <motion.p key="fs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">AgentTool spawns a fork — a new query loop is created</motion.p>
          )}
          {phase === 'inherit-messages' && (
            <motion.p key="im" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">fork receives the parent's <span className="text-blue-400">messages</span>, system prompt, and file state</motion.p>
          )}
          {phase === 'inherit-cache' && (
            <motion.p key="ic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">prompt cache is <span className="text-green-400">shared</span> — fork pays 0.1× cost instead of re-building from scratch</motion.p>
          )}
          {phase === 'fork-runs' && (
            <motion.p key="fr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">fork runs independently in the background with restricted tools</motion.p>
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
