import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'model-streaming', 'tool1-start', 'tool2-start', 'model-done', 'done'] as const
const PHASE_DURATIONS = [600, 2200, 2000, 2000, 1800, 3000]

type Phase = typeof PHASES[number]

const MODEL_WIDTH: Record<Phase, string> = {
  'idle':            '0%',
  'model-streaming': '38%',
  'tool1-start':     '62%',
  'tool2-start':     '85%',
  'model-done':      '100%',
  'done':            '100%',
}

const TOOL1_WIDTH: Record<Phase, string> = {
  'idle':            '0%',
  'model-streaming': '0%',
  'tool1-start':     '45%',
  'tool2-start':     '78%',
  'model-done':      '92%',
  'done':            '100%',
}

const TOOL2_WIDTH: Record<Phase, string> = {
  'idle':            '0%',
  'model-streaming': '0%',
  'tool1-start':     '0%',
  'tool2-start':     '35%',
  'model-done':      '75%',
  'done':            '100%',
}

function Bar({
  label, sublabel, width, color, visible, done,
}: {
  label: string
  sublabel: string
  width: string
  color: string
  visible: boolean
  done: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-right">
        <div className="text-xs text-zinc-300 font-mono">{label}</div>
        <div className="text-[10px] text-zinc-600">{sublabel}</div>
      </div>
      <div className="flex-1 h-5 bg-zinc-800 rounded-md overflow-hidden relative">
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-md ${color}`}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="w-8 text-[10px] font-mono">
        {done ? <span className="text-green-500">done</span> : null}
      </div>
    </div>
  )
}

export function StreamingExecutorAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx = PHASES.indexOf(phase)

  const tool1Visible = phaseIdx >= PHASES.indexOf('tool1-start')
  const tool2Visible = phaseIdx >= PHASES.indexOf('tool2-start')
  const modelDone    = phaseIdx >= PHASES.indexOf('model-done')
  const isDone       = phase === 'done'

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-5">

      <div className="flex flex-col gap-5">

        {/* Timeline label */}
        <div className="flex items-center gap-3">
          <div className="w-28 shrink-0" />
          <div className="flex-1 flex justify-between text-[9px] text-zinc-700 font-mono px-0.5">
            <span>start</span>
            <span>time →</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Model stream bar */}
        <Bar
          label="Model stream"
          sublabel="tokens arriving"
          width={MODEL_WIDTH[phase]}
          color={modelDone ? 'bg-zinc-500' : 'bg-zinc-400'}
          visible={phaseIdx >= 1}
          done={modelDone}
        />

        {/* Tool 1 — appears mid-stream */}
        <div className="relative">
          <Bar
            label="Read (tool 1)"
            sublabel="starts at ~38%"
            width={TOOL1_WIDTH[phase]}
            color={isDone ? 'bg-blue-600' : 'bg-blue-700'}
            visible={tool1Visible}
            done={isDone}
          />
          <AnimatePresence>
            {phase === 'tool1-start' && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-5 left-[calc(28%+112px+12px)] text-[9px] text-blue-400 font-mono whitespace-nowrap"
              >
                ↑ tool_use arrives — starts now
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tool 2 — appears mid-stream */}
        <div className="relative">
          <Bar
            label="Read (tool 2)"
            sublabel="starts at ~62%"
            width={TOOL2_WIDTH[phase]}
            color={isDone ? 'bg-blue-600' : 'bg-blue-700'}
            visible={tool2Visible}
            done={isDone}
          />
          <AnimatePresence>
            {phase === 'tool2-start' && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-5 left-[calc(52%+112px+12px)] text-[9px] text-blue-400 font-mono whitespace-nowrap"
              >
                ↑ tool_use arrives — starts now
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status callout */}
      <div className="min-h-[48px] mt-4">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">
              model hasn't started yet
            </motion.p>
          )}
          {phase === 'model-streaming' && (
            <motion.p key="stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              model is streaming — no tool calls yet
            </motion.p>
          )}
          {(phase === 'tool1-start' || phase === 'tool2-start') && (
            <motion.p key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-blue-400 text-xs">
              tools running <span className="text-zinc-500">while model still generating</span>
            </motion.p>
          )}
          {phase === 'model-done' && (
            <motion.p key="mdone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">
              model done — tools still finishing
            </motion.p>
          )}
          {phase === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-green-800 bg-green-950/50 px-3 py-2 text-xs text-green-400">
              all results ready — sending next request
              <span className="text-zinc-500 ml-2 text-[10px]">latency saved by parallel execution</span>
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
