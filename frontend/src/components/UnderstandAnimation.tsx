import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = [
  'idle',
  'local-input', 'local-done',
  'hybrid-input', 'hybrid-done',
  'msg-input',    'msg-done',
] as const
const PHASE_DURATIONS = [500, 3000, 4000, 3000, 4000, 3000, 4000]

type InputState = 'none' | 'local' | 'hybrid' | 'message'
type ResultState = 'none' | 'local' | 'hybrid' | 'message'

export function UnderstandAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx = PHASES.indexOf(phase)

  const inputState: InputState =
    phaseIdx >= PHASES.indexOf('msg-input')    ? 'message' :
    phaseIdx >= PHASES.indexOf('hybrid-input') ? 'hybrid'  :
    phaseIdx >= PHASES.indexOf('local-input')  ? 'local'   : 'none'

  const resultState: ResultState =
    phase === 'msg-done'    ? 'message' :
    phase === 'hybrid-done' ? 'hybrid'  :
    phase === 'local-done'  ? 'local'   : 'none'

  const showUnderstand = inputState !== 'none'

  const inputText =
    inputState === 'message' ? 'fix the bug in auth.ts' :
    inputState === 'hybrid'  ? '/review'                :
    inputState === 'local'   ? '/help'                  : ''

  const inputColor =
    inputState === 'message' ? 'text-zinc-200' :
    inputState === 'hybrid'  ? 'text-blue-300' : 'text-amber-300'

  const understandSub =
    resultState === 'local'   ? 'shouldQuery: false' :
    resultState === 'hybrid'  ? 'local logic → shouldQuery: true' :
    resultState === 'message' ? 'shouldQuery: true' : ''

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      {/* User input */}
      <div className="min-h-[64px]">
        <AnimatePresence mode="wait">
          {inputState !== 'none' && (
            <motion.div
              key={inputState}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3"
            >
              <div className="text-[10px] text-zinc-600 font-mono mb-1">user input</div>
              <div className={`text-sm font-mono ${inputColor}`}>&gt; {inputText}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Arrow + Understand box */}
      <AnimatePresence>
        {showUnderstand && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-1">
            <div className="w-px h-5 bg-zinc-700" />
            <div className="rounded-lg border border-amber-700 bg-amber-950/40 px-8 py-2.5 text-center">
              <div className="text-xs font-semibold text-amber-300">Understand</div>
              <AnimatePresence mode="wait">
                {understandSub && (
                  <motion.div key={understandSub}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {understandSub}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-px h-5 bg-zinc-700" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <div className="min-h-[72px]">
        <AnimatePresence mode="wait">
          {resultState === 'local' && (
            <motion.div key="local"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-green-800 bg-green-950/40 px-4 py-3">
              <div className="text-xs font-semibold text-green-400 mb-1">handled locally</div>
              <div className="text-[10px] text-zinc-500 font-mono">no API call · result returned immediately</div>
            </motion.div>
          )}
          {resultState === 'hybrid' && (
            <motion.div key="hybrid"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-blue-800 bg-blue-950/40 px-4 py-3">
              <div className="text-xs font-semibold text-blue-300 mb-1">local logic → API follow-up</div>
              <div className="text-[10px] text-zinc-500 font-mono">command runs first · then forwarded to model</div>
            </motion.div>
          )}
          {resultState === 'message' && (
            <motion.div key="message"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3">
              <div className="text-xs font-semibold text-amber-300 mb-1">Save → Run</div>
              <div className="text-[10px] text-zinc-500 font-mono">message written to disk · API call made</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status */}
      <div className="min-h-[40px]">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">three paths through Understand</motion.p>
          )}
          {phase === 'local-input' && (
            <motion.p key="li" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">local slash command — <span className="text-amber-300">/help</span>, /clear, /config…</motion.p>
          )}
          {phase === 'local-done' && (
            <motion.p key="ld" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">shouldQuery: false — query loop never runs</motion.p>
          )}
          {phase === 'hybrid-input' && (
            <motion.p key="hi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">hybrid command — <span className="text-blue-300">/review</span>, /plan, /thinkback…</motion.p>
          )}
          {phase === 'hybrid-done' && (
            <motion.p key="hd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">runs local logic first, then opts in to model follow-up</motion.p>
          )}
          {phase === 'msg-input' && (
            <motion.p key="mi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">normal user message — always goes to the model</motion.p>
          )}
          {phase === 'msg-done' && (
            <motion.p key="md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">shouldQuery: true — proceeds to Save → Run</motion.p>
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
