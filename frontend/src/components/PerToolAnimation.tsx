import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['start', 'lookup', 'validate', 'error', 'retry', 'precheck', 'permissions', 'execute', 'done'] as const
const PHASE_DURATIONS = [800, 2000, 2000, 2800, 2000, 2000, 2000, 2500, 3000]

type Phase = typeof PHASES[number]

const STEPS = [
  { num: 1,  label: 'Tool lookup',              group: 'lookup'      },
  { num: 2,  label: 'Abort check',              group: 'lookup'      },
  { num: 3,  label: 'Zod schema validation',    group: 'validate'    },
  { num: 4,  label: 'validateInput()',           group: 'validate'    },
  { num: 5,  label: 'Speculative classifier',   group: 'precheck'    },
  { num: 6,  label: 'backfillObservableInput()', group: 'precheck'   },
  { num: 7,  label: 'PreToolUse hooks',         group: 'precheck'    },
  { num: 8,  label: 'canUseTool()',             group: 'permissions' },
  { num: 9,  label: 'tool.call()',              group: 'execute'     },
  { num: 10, label: 'Result serialization',     group: 'execute'     },
  { num: 11, label: 'PostToolUse hooks',        group: 'execute'     },
]

const GROUP_ORDER = ['lookup', 'validate', 'precheck', 'permissions', 'execute']

function stepState(group: string, phase: Phase): 'idle' | 'active' | 'done' | 'error' {
  const gi = GROUP_ORDER.indexOf(group)
  if (phase === 'start') return 'idle'
  if (phase === 'done') return 'done'

  if (phase === 'error') {
    if (group === 'validate') return 'error'
    return gi < GROUP_ORDER.indexOf('validate') ? 'done' : 'idle'
  }
  if (phase === 'retry') {
    if (group === 'validate') return 'active'
    return gi < GROUP_ORDER.indexOf('validate') ? 'done' : 'idle'
  }

  const ci = GROUP_ORDER.indexOf(phase as string)
  if (ci < 0) return 'idle'
  if (gi < ci) return 'done'
  if (gi === ci) return 'active'
  return 'idle'
}

const STATE_STYLES = {
  idle:   'border-zinc-700 bg-zinc-900   text-zinc-600',
  active: 'border-amber-500 bg-amber-950 text-white',
  done:   'border-zinc-700 bg-zinc-900   text-zinc-500',
  error:  'border-red-700  bg-red-950    text-red-400',
}

const NUM_STYLES = {
  idle:   'text-zinc-700',
  active: 'text-amber-500',
  done:   'text-green-600',
  error:  'text-red-500',
}

export function PerToolAnimation() {
  const { phaseIdx, phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const retryIdx     = PHASES.indexOf('retry')
  const isCorrected  = phaseIdx >= retryIdx  // retry and all phases after it
  const isError      = phase === 'error'
  const isRetry      = phase === 'retry'
  const isDone       = phase === 'done'

  return (
    <div className="h-full flex flex-col justify-between py-6 px-4">

      {/* Tool call header */}
      <div className="mb-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5">
        <div className="text-[10px] text-zinc-600 font-mono mb-1">incoming tool call</div>
        <div className="flex items-baseline gap-2">
          <span className="text-amber-400 font-mono text-xs font-semibold">FileEdit</span>
          <AnimatePresence mode="wait">
            {isCorrected ? (
              <motion.span
                key="corrected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[10px] text-zinc-400"
              >
                old_string: <span className="text-green-400">"return undefined"</span>
                {isRetry && <span className="ml-1.5 text-green-600 text-[9px]">✓ corrected</span>}
              </motion.span>
            ) : (
              <motion.span
                key="original"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[10px] text-zinc-400"
              >
                old_string: <span className="text-zinc-300">"return null"</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Steps list */}
      <div key={cycle} className="flex flex-col gap-1 flex-1">
        {STEPS.map((step) => {
          const state = stepState(step.group, phase)
          return (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.num * 0.04, duration: 0.2 }}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors duration-300 ${STATE_STYLES[state]}`}
            >
              <span className={`font-mono text-[10px] w-4 shrink-0 transition-colors duration-300 ${NUM_STYLES[state]}`}>
                {state === 'done' ? '✓' : step.num}
              </span>
              <span className="text-xs leading-tight">{step.label}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Error / self-correction callout */}
      <div className="mt-3 min-h-[52px]">
        <AnimatePresence>
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-[10px] leading-relaxed"
            >
              <span className="text-red-400 font-mono">InputValidationError: </span>
              <span className="text-red-300">old_string not found in file</span>
              <div className="text-zinc-500 mt-1">→ returned as tool_result · model corrects on next turn</div>
            </motion.div>
          )}
          {isRetry && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="rounded-lg border border-green-800 bg-green-950/60 px-3 py-2 text-[10px] leading-relaxed"
            >
              <span className="text-green-400">Model retried with corrected input</span>
              <div className="text-zinc-500 mt-1">no special retry loop — same query loop, next turn</div>
            </motion.div>
          )}
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] text-zinc-500"
            >
              tool_result returned to query loop
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className="text-zinc-500 hover:text-white text-xs transition-colors"
        >
          {autoPlay ? '⏸' : '▶'}
        </button>
        <div className="flex gap-3">
          <button onClick={prev} className="text-zinc-500 hover:text-white text-xs transition-colors">← back</button>
          <button onClick={next} className="text-zinc-500 hover:text-white text-xs transition-colors">next →</button>
          <button onClick={reset} className="text-zinc-500 hover:text-white text-xs transition-colors">↺</button>
        </div>
      </div>
    </div>
  )
}
