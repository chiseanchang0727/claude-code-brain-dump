import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

type Phase = 'building' | 'threshold' | 'fork' | 'replace' | 'done'

interface Msg {
  id: string
  role: 'user' | 'assistant' | 'tool_result'
  text: string
  resultIdx?: number
}

const MESSAGES: Msg[] = [
  { id: 'u1', role: 'user',        text: 'refactor the entire codebase' },
  { id: 'a1', role: 'assistant',   text: 'Read · src/index.ts' },
  { id: 'r1', role: 'tool_result', text: '320 lines', resultIdx: 0 },
  { id: 'a2', role: 'assistant',   text: 'Edit · src/auth.ts' },
  { id: 'r2', role: 'tool_result', text: 'edit applied', resultIdx: 1 },
  { id: 'a3', role: 'assistant',   text: 'Read · src/query.ts' },
  { id: 'r3', role: 'tool_result', text: '580 lines', resultIdx: 2 },
  { id: 'a4', role: 'assistant',   text: 'Edit · src/query.ts' },
  { id: 'r4', role: 'tool_result', text: 'edit applied', resultIdx: 3 },
  { id: 'a5', role: 'assistant',   text: 'Bash · npm test' },
  { id: 'r5', role: 'tool_result', text: '3 tests failing', resultIdx: 4 },
  { id: 'u2', role: 'user',        text: 'fix the failing tests' },
]

const LINE_WIDTHS = [
  [80, 65, 90, 55, 72],
  [60, 45],
  [85, 70, 90, 60, 78, 55, 88],
  [55, 40],
  [75, 88, 62],
]

const DOT: Record<string, string> = {
  user: 'bg-blue-500',
  assistant: 'bg-indigo-400',
  tool_result: 'bg-amber-400',
}
const LABEL_CLR: Record<string, string> = {
  user: 'text-blue-400',
  assistant: 'text-indigo-400',
  tool_result: 'text-amber-400',
}

const PHASES = ['building', 'threshold', 'fork', 'replace', 'done'] as const
const PHASE_LABELS: Record<Phase, string> = {
  building:  'conversation growing',
  threshold: 'token limit approaching',
  fork:      'compact agent spawned',
  replace:   'entire history replaced',
  done:      'conversation continues from boundary',
}
const PHASE_DURATIONS = [1800, 2000, 2000, 2200, 3000]

const TOKEN_PCT: Record<Phase, number> = {
  building:  62,
  threshold: 94,
  fork:      94,
  replace:   18,
  done:      18,
}

export function AutocompactAnimation() {
  const { phaseIdx, phase, cycle, prev, next, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const replaced = phase === 'replace' || phase === 'done'
  const atThreshold = phase === 'threshold' || phase === 'fork'

  return (
    <div className="h-full flex flex-col select-none gap-3">

      {/* Token usage bar */}
      <div className="shrink-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[10px] text-zinc-600 font-mono">token usage</span>
          <span className={`text-[10px] font-mono transition-colors duration-500 ${
            atThreshold ? 'text-red-400' : replaced ? 'text-green-400' : 'text-zinc-500'
          }`}>
            {atThreshold ? 'contextWindow − 13k buffer' : replaced ? 'compacted' : '~62% full'}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            animate={{
              width: `${TOKEN_PCT[phase]}%`,
              backgroundColor: atThreshold ? '#ef4444' : replaced ? '#22c55e' : '#6366f1',
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500/50"
            style={{ left: '87%' }}
          />
        </div>
        <AnimatePresence>
          {atThreshold && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-[10px] text-red-400 text-right"
            >
              tokenUsage ≥ contextWindow − reservedOutput − 13,000
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fork indicator */}
      <AnimatePresence>
        {phase === 'fork' && (
          <motion.div
            key="fork"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700 rounded-md px-3 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 rounded-full border-2 border-zinc-600 border-t-amber-400 shrink-0"
            />
            <span>compact agent running</span>
            <span className="text-zinc-600 text-[10px]">— querySource: 'compact' · cannot self-compact</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-h-0">
        <AnimatePresence initial={false}>
          {!replaced && MESSAGES.map((msg, i) => (
            <motion.div
              key={`${cycle}-${msg.id}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25, exit: { delay: i * 0.03 } }}
              className="flex gap-2 items-start py-0.5 shrink-0"
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 ${DOT[msg.role]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`text-xs font-mono shrink-0 ${LABEL_CLR[msg.role]}`}>
                    {msg.role}
                  </span>
                  <span className="text-sm text-zinc-400 truncate">{msg.text}</span>
                </div>
                {msg.role === 'tool_result' && msg.resultIdx !== undefined && (
                  <div className="mt-1.5 space-y-1">
                    {LINE_WIDTHS[msg.resultIdx].map((w, j) => (
                      <div key={j} className="h-1 bg-zinc-700/80 rounded" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Summary block */}
        <AnimatePresence>
          {replaced && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-orange-500/40 bg-orange-500/8 px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400">
                  autocompact summary
                </span>
                <span className="text-[10px] text-orange-500/60 font-mono">
                  {MESSAGES.length} msgs → 1 block
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Refactored <code className="text-orange-300 text-[10px]">src/auth.ts</code> and{' '}
                <code className="text-orange-300 text-[10px]">src/query.ts</code>. Tests run — 3 failures
                remain in the auth suite. Currently investigating.
              </p>
              <AnimatePresence>
                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-2.5 pt-2 border-t border-orange-500/20 text-[10px] text-orange-500/50"
                  >
                    granular history gone · model continues from this boundary
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="pt-2 shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">{PHASE_LABELS[phase]}</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAutoPlay(a => !a)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              autoPlay
                ? 'border-amber-500/50 text-amber-400 hover:border-amber-400'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            {autoPlay ? '⏸' : '▶'}
          </button>
          <button
            onClick={prev}
            disabled={phaseIdx === 0}
            className="text-xs px-3 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            ← back
          </button>
          <button
            onClick={next}
            className="text-xs px-3 py-1 rounded border border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
          >
            {phaseIdx === PHASES.length - 1 ? 'restart →' : 'next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
