import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

type Phase = 'building' | 'identify' | 'protect' | 'snip' | 'done'

interface Msg {
  id: string
  role: 'user' | 'assistant' | 'tool_result'
  text: string
  tokens?: number
  snippable?: boolean
  protected?: boolean
  resultIdx?: number
}

const MESSAGES: Msg[] = [
  { id: 'u1', role: 'user',        text: 'analyze the codebase' },
  { id: 'a1', role: 'assistant',   text: 'Bash · find . -name "*.ts" | wc -l' },
  { id: 'r1', role: 'tool_result', text: '847 files found', tokens: 1200, resultIdx: 0, snippable: true },
  { id: 'a2', role: 'assistant',   text: 'Read · src/index.ts' },
  { id: 'r2', role: 'tool_result', text: 'file contents (200 lines)', tokens: 2100, resultIdx: 1, snippable: true },
  { id: 'a3', role: 'assistant',   text: 'Read · src/query.ts' },
  { id: 'r3', role: 'tool_result', text: 'file contents (500 lines)', tokens: 4800, resultIdx: 2, snippable: true },
  { id: 'a4', role: 'assistant',   text: 'Bash · grep TODO src/query.ts' },
  { id: 'r4', role: 'tool_result', text: '12 matches found', tokens: 320, resultIdx: 3, protected: true },
  { id: 'u2', role: 'user',        text: 'focus on query.ts', protected: true },
]

const LINE_WIDTHS = [
  [80, 55],
  [75, 90, 60, 82],
  [70, 88, 65, 78, 55, 92],
  [85, 60],
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

const PHASES = ['building', 'identify', 'protect', 'snip', 'done'] as const
const PHASE_LABELS: Record<Phase, string> = {
  building: 'messages arriving',
  identify: 'flagging low-value chunks',
  protect:  'marking protected tail',
  snip:     'removing flagged messages',
  done:     'snipTokensFreed reported',
}
const PHASE_DURATIONS = [1500, 2000, 1500, 2000, 3000]

const TOTAL_SNIPPED = 1200 + 2100 + 4800

export function SnipAnimation() {
  const { phaseIdx, phase, cycle, prev, next, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const showFlags   = phase === 'identify' || phase === 'protect' || phase === 'snip' || phase === 'done'
  const showProtect = phase === 'protect'  || phase === 'snip'    || phase === 'done'
  const snipped     = phase === 'snip'     || phase === 'done'

  return (
    <div className="h-full flex flex-col select-none">

      {/* Message list */}
      <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
        <AnimatePresence initial={false}>
          {MESSAGES.map((msg, i) => {
            const isSnippable = msg.snippable
            const isProtected = msg.protected
            const isGone = snipped && isSnippable

            if (isGone) return null

            const flagged   = showFlags   && isSnippable
            const protected_ = showProtect && isProtected

            return (
              <motion.div
                key={`${cycle}-${msg.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  ...(flagged && !snipped ? { backgroundColor: 'rgba(239,68,68,0.06)' } : {}),
                  ...(protected_ ? { backgroundColor: 'rgba(34,197,94,0.06)' } : {}),
                }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                transition={{ delay: isGone ? 0 : i * 0.1, duration: 0.3 }}
                className="flex gap-2 items-start py-1 px-1.5 rounded"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 ${DOT[msg.role]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-mono shrink-0 ${LABEL_CLR[msg.role]}`}>
                      {msg.role}
                    </span>
                    <span className="text-sm text-zinc-400 truncate">{msg.text}</span>

                    {/* Token badge on flagged tool results */}
                    {msg.tokens && flagged && !snipped && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-mono"
                      >
                        ~{(msg.tokens / 1000).toFixed(1)}k tok
                      </motion.span>
                    )}

                    {/* Protected badge */}
                    {protected_ && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 border border-green-500/30 text-green-400"
                      >
                        protected
                      </motion.span>
                    )}
                  </div>

                  {/* Content bars for tool results */}
                  {msg.role === 'tool_result' && msg.resultIdx !== undefined && (
                    <div className="mt-1.5 space-y-1">
                      {LINE_WIDTHS[msg.resultIdx].map((w, j) => (
                        <div
                          key={j}
                          className={`h-1 rounded transition-colors duration-300 ${
                            flagged && !snipped ? 'bg-red-900/60' : 'bg-zinc-700/80'
                          }`}
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* snipTokensFreed result */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              key="freed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-md px-2.5 py-1.5"
            >
              <span className="font-semibold">snipTokensFreed</span>
              <span className="font-mono text-green-300">= {TOTAL_SNIPPED.toLocaleString()}</span>
              <span className="text-green-600">— fed into autocompact threshold</span>
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
