import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

type Phase = 'building' | 'collapse' | 'project' | 'preserved'

interface Msg {
  id: string
  role: 'user' | 'assistant' | 'tool_result'
  text: string
  archived?: boolean
  resultIdx?: number
}

const MESSAGES: Msg[] = [
  { id: 'u1', role: 'user',        text: 'refactor the auth module' },
  { id: 'a1', role: 'assistant',   text: 'Read · src/auth/index.ts' },
  { id: 'r1', role: 'tool_result', text: '200 lines of source', resultIdx: 0, archived: true },
  { id: 'a2', role: 'assistant',   text: 'Edit · src/auth/index.ts' },
  { id: 'r2', role: 'tool_result', text: 'edit applied successfully', resultIdx: 1, archived: true },
  { id: 'a3', role: 'assistant',   text: 'Read · src/auth/middleware.ts' },
  { id: 'r3', role: 'tool_result', text: '150 lines of source', resultIdx: 2, archived: true },
  { id: 'a4', role: 'assistant',   text: 'Bash · npm test' },
  { id: 'r4', role: 'tool_result', text: 'all 42 tests passing', resultIdx: 3 },
  { id: 'u2', role: 'user',        text: 'what else needs updating?' },
]

const LINE_WIDTHS = [
  [75, 88, 62, 79],
  [68, 55],
  [82, 70, 60, 85],
  [90, 72],
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

const PHASES = ['building', 'collapse', 'project', 'preserved'] as const
const PHASE_LABELS: Record<Phase, string> = {
  building:  'full history loaded',
  collapse:  'collapse store — summary created',
  project:   'projectView() applied — model sees summary',
  preserved: 'originals intact — reversible at any time',
}
const PHASE_DURATIONS = [3000, 3000, 4000, 4000]

const ARCHIVED_COUNT = MESSAGES.filter(m => m.archived).length

export function ContextCollapseAnimation() {
  const { phaseIdx, phase, cycle, prev, next, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const showSummary  = phase === 'collapse'  || phase === 'project' || phase === 'preserved'
  const projected    = phase === 'project'   || phase === 'preserved'
  const showPreserved = phase === 'preserved'

  return (
    <div className="h-full flex flex-col select-none">

      {/* Message list */}
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
        <AnimatePresence initial={false}>
          {MESSAGES.map((msg, i) => {
            const isArchived = msg.archived
            const isHidden   = projected && isArchived

            if (isHidden) return null

            return (
              <motion.div
                key={`${cycle}-${msg.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: showSummary && isArchived ? 0.35 : 1,
                  x: 0,
                }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="flex gap-2 items-start py-0.5"
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
            )
          })}
        </AnimatePresence>

        {/* Summary card — collapse store entry + projected overlay */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className={`my-1 rounded-lg border px-3 py-2.5 ${
                projected
                  ? 'border-violet-500/40 bg-violet-500/8'
                  : 'border-zinc-600/50 bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-mono uppercase tracking-wider ${
                  projected ? 'text-violet-400' : 'text-zinc-500'
                }`}>
                  {projected ? 'projected summary' : 'collapse store · summary'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  projected
                    ? 'border-violet-500/40 text-violet-400'
                    : 'border-zinc-600 text-zinc-500'
                }`}>
                  {ARCHIVED_COUNT} msgs →
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Refactored auth module — updated{' '}
                <code className="text-violet-300 text-[10px]">index.ts</code> and{' '}
                <code className="text-violet-300 text-[10px]">middleware.ts</code>,
                all tests passing.
              </p>

              {/* Preserved badge */}
              <AnimatePresence>
                {showPreserved && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 flex items-center gap-1.5 text-[10px] text-green-400"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    originals archived — not deleted · collapse is reversible
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="pt-4 shrink-0 flex items-center justify-between">
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
