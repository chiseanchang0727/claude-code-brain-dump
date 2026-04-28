import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

type Phase = 'building' | 'trigger' | 'compact' | 'pause'
type Mode = 'time' | 'count'

interface Msg {
  id: string
  role: 'user' | 'assistant' | 'tool_result'
  text: string
  resultIdx?: number
  compactable?: boolean
}

const MESSAGES: Msg[] = [
  { id: 'u1', role: 'user',        text: 'check the error logs' },
  { id: 'a1', role: 'assistant',   text: 'Bash · tail -n 100 app.log' },
  { id: 'r1', role: 'tool_result', text: '98 lines of output', resultIdx: 0, compactable: true },
  { id: 'a2', role: 'assistant',   text: 'Read · src/logger.ts' },
  { id: 'r2', role: 'tool_result', text: 'file contents (72 lines)', resultIdx: 1, compactable: true },
  { id: 'a3', role: 'assistant',   text: 'Bash · grep ERROR app.log' },
  { id: 'r3', role: 'tool_result', text: '3 matches found', resultIdx: 2, compactable: false },
  { id: 'u2', role: 'user',        text: 'what did you find?' },
]

const LINE_WIDTHS = [
  [72, 85, 61, 78, 55],
  [68, 90, 74, 58],
  [82, 65],
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

const PHASES = ['building', 'trigger', 'compact', 'pause'] as const

const PHASE_LABELS: Record<Phase, string> = {
  building:  'messages arriving',
  trigger:   'trigger detected',
  compact:   'old results cleared',
  pause:     'done',
}
const PHASE_DURATIONS = [2000, 2000, 2000, 2500]

export function MicrocompactAnimation() {
  const [mode, setMode] = useState<Mode>('time')
  const { phaseIdx, phase, cycle, prev, next, autoPlay, setAutoPlay, reset } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const showTrigger = phase === 'trigger' || phase === 'compact' || phase === 'pause'
  const compacted   = phase === 'compact'  || phase === 'pause'

  const switchMode = (m: Mode) => {
    setMode(m)
    reset()
  }

  return (
    <div className="h-full flex flex-col select-none">

      {/* Mode pills — clickable */}
      <div className="flex gap-2 mb-5 shrink-0">
        {(['time', 'count'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors duration-200 ${
              mode === m
                ? 'border-amber-500 text-amber-400'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
            }`}
          >
            {m === 'time' ? 'Path 1 · time gap' : 'Path 2 · count / cache'}
          </button>
        ))}
      </div>

      {/* Count trigger badge */}
      <AnimatePresence>
        {mode === 'count' && showTrigger && (
          <motion.div
            key="count-badge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 shrink-0 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5"
          >
            <span className="font-semibold">⚡ keepRecent=1</span>
            <span className="text-amber-500/70">— 2 old tool_results over limit → cache edits queued at API layer</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message list */}
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {MESSAGES.map((msg, i) => {
          const cleared = compacted && msg.compactable

          return (
            <div key={`${cycle}-${msg.id}`}>
              {mode === 'time' && msg.id === 'r3' && (
                <AnimatePresence>
                  {showTrigger && (
                    <motion.div
                      key="gap-line"
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="my-2 flex items-center gap-2 origin-left"
                    >
                      <div className="flex-1 border-t border-dashed border-amber-500/50" />
                      <span className="text-xs text-amber-400 shrink-0 whitespace-nowrap">
                        ⏱ Δt &gt; threshold · cache TTL expired
                      </span>
                      <div className="flex-1 border-t border-dashed border-amber-500/50" />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.25 }}
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
                    <AnimatePresence mode="wait" initial={false}>
                      {cleared ? (
                        <motion.div
                          key="cleared"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="mt-0.5 text-xs text-zinc-600 italic"
                        >
                          content cleared
                        </motion.div>
                      ) : (
                        <motion.div
                          key="full"
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="mt-1.5 space-y-1 overflow-hidden"
                        >
                          {LINE_WIDTHS[msg.resultIdx].map((w, j) => (
                            <div key={j} className="h-1 bg-zinc-700/80 rounded" style={{ width: `${w}%` }} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="mt-auto pt-4 shrink-0 flex items-center justify-between">
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
