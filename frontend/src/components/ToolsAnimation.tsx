import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'base', 'mcp', 'pool'] as const
const PHASE_DURATIONS = [500, 2500, 2500, 3500]

const BUILT_INS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Agent', 'Task', 'TodoRead', 'WebFetch', 'WebSearch']

const MCP_TOOLS = [
  { id: 'db', name: 'db::query' },
  { id: 'gh', name: 'gh::list_prs' },
]

const POOL_SORTED = ['Agent', 'Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Task', 'TodoRead', 'WebFetch', 'WebSearch', 'Write']

function Pill({ name, variant }: { name: string; variant: 'normal' | 'mcp' }) {
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
      variant === 'mcp' ? 'border-blue-700 bg-blue-950/40 text-blue-300'
                        : 'border-zinc-600 bg-zinc-800 text-zinc-200'
    }`}>
      {name}
    </span>
  )
}

export function ToolsAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx = PHASES.indexOf(phase)
  const showBase = phaseIdx >= PHASES.indexOf('base')
  const showMcp  = phaseIdx >= PHASES.indexOf('mcp')
  const showPool = phaseIdx >= PHASES.indexOf('pool')

  const stepLabel =
    showPool ? 'assembleToolPool()' :
    showMcp  ? 'getAllBaseTools()' :
    showBase ? 'getAllBaseTools()' : ''

  return (
    <div key={cycle} className="h-full flex flex-col gap-5 py-6 px-4">

      {/* Built-in tools */}
      <AnimatePresence>
        {showBase && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[10px] text-zinc-500 font-mono mb-2.5">{stepLabel}</div>
            <div className="flex flex-wrap gap-1.5">
              {!showPool
                ? BUILT_INS.map(name => (
                    <motion.div key={name} layout>
                      <Pill name={name} variant="normal" />
                    </motion.div>
                  ))
                : (
                  <>
                    {POOL_SORTED.map(name => (
                      <motion.div key={name} layout>
                        <Pill name={name} variant="normal" />
                      </motion.div>
                    ))}
                    <span className="text-zinc-700 text-xs self-center px-1">│</span>
                    {MCP_TOOLS.map(t => (
                      <motion.div key={t.id} layout>
                        <Pill name={t.name} variant="mcp" />
                      </motion.div>
                    ))}
                  </>
                )
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MCP tools — visible before pool merges them */}
      <AnimatePresence>
        {showMcp && !showPool && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-[10px] text-zinc-500 font-mono mb-2.5">+ MCP tools</div>
            <div className="flex flex-wrap gap-1.5">
              {MCP_TOOLS.map(t => <Pill key={t.id} name={t.name} variant="mcp" />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status */}
      <div className="mt-auto min-h-[52px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">tool registry pipeline</motion.p>
          )}
          {phase === 'base' && (
            <motion.p key="base" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              45+ built-in tools loaded at session start
            </motion.p>
          )}
          {phase === 'mcp' && (
            <motion.p key="mcp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              <span className="text-blue-400">MCP tools</span> injected from connected servers
            </motion.p>
          )}
          {phase === 'pool' && (
            <motion.div key="pool" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-green-800 bg-green-950/40 px-3 py-2 text-xs text-green-400">
              built-ins and MCP sorted independently — interleaving would bust the prompt cache on any MCP change
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
