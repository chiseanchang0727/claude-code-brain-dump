import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'query', 'scan', 'select', 'inject'] as const
const PHASE_DURATIONS = [3000, 5000, 5000, 5000, 5000]

const ALL_FILES = [
  { id: 'f1', name: 'user_role.md',        desc: 'senior eng, Go expert' },
  { id: 'f2', name: 'feedback_tests.md',   desc: 'use real DB in tests' },
  { id: 'f3', name: 'project_auth.md',     desc: 'auth middleware rewrite' },
  { id: 'f4', name: 'feedback_commits.md', desc: 'terse commit messages' },
  { id: 'f5', name: 'project_deadline.md', desc: 'release freeze Thu' },
]

const SELECTED_IDS = ['f1', 'f3', 'f5']

export function PrefetchAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx  = PHASES.indexOf(phase)
  const showFiles = phaseIdx >= PHASES.indexOf('scan')
  const showSelect = phaseIdx >= PHASES.indexOf('select')
  const showInject = phaseIdx >= PHASES.indexOf('inject')

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      {/* User query */}
      <AnimatePresence>
        {phaseIdx >= PHASES.indexOf('query') && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5">
            <div className="text-[10px] text-zinc-600 font-mono mb-1">user message</div>
            <div className="text-xs text-zinc-200 font-mono">&gt; fix the auth middleware bug</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory file list */}
      <AnimatePresence>
        {showFiles && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[10px] text-zinc-500 font-mono mb-2">
              {showSelect ? 'Sonnet reviewing manifest…' : 'scanning ~/.claude/.../memory/ headers'}
            </div>
            <div className="space-y-1">
              {ALL_FILES.map(f => {
                const selected = SELECTED_IDS.includes(f.id)
                const isChosen = showSelect && selected
                const isDimmed = showSelect && !selected
                return (
                  <motion.div key={f.id} layout
                    className={`flex items-center gap-2 px-2 py-1 rounded border transition-colors duration-500 ${
                      isChosen ? 'border-blue-700 bg-blue-950/40' :
                      isDimmed ? 'border-zinc-800 bg-zinc-900/40 opacity-30' :
                                 'border-zinc-700 bg-zinc-900'
                    }`}>
                    <span className="text-[10px] text-zinc-500">📄</span>
                    <span className={`text-[10px] font-mono ${isChosen ? 'text-blue-300' : 'text-zinc-400'}`}>
                      {f.name}
                    </span>
                    <span className="text-[10px] text-zinc-600 truncate">{f.desc}</span>
                    {isChosen && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="ml-auto text-[10px] text-blue-400">✓</motion.span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Injected attachments */}
      <div className="min-h-[60px]">
        <AnimatePresence>
          {showInject && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-[10px] text-zinc-500 font-mono mb-2">injected as attachments</div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_FILES.filter(f => SELECTED_IDS.includes(f.id)).map(f => (
                  <span key={f.id} className="text-[10px] font-mono text-green-400 border border-green-900 bg-green-950/50 px-2 py-0.5 rounded">
                    📎 {f.name}
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
              className="text-zinc-300 text-xs">relevance-based memory injection</motion.p>
          )}
          {phase === 'query' && (
            <motion.p key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">prefetch starts in parallel with the API call</motion.p>
          )}
          {phase === 'scan' && (
            <motion.p key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">reads frontmatter only — no full file reads</motion.p>
          )}
          {phase === 'select' && (
            <motion.p key="sel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              <span className="text-blue-400">Sonnet</span> picks up to 5 relevant memories — cheaper than Opus
            </motion.p>
          )}
          {phase === 'inject' && (
            <motion.div key="inj" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-green-800 bg-green-950/40 px-3 py-2 text-xs text-green-400">
              3 memories in context · model sees them before responding
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
