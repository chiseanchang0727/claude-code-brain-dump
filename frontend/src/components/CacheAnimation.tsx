import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'

const PHASES = ['idle', 'turn1', 'turn2', 'turn3', 'forks'] as const
const PHASE_DURATIONS = [600, 2500, 2500, 2500, 4000]

const TURNS = [
  { label: 'Turn 1', cachedPct: 0,  newPct: 98, note: 'cache written' },
  { label: 'Turn 2', cachedPct: 44, newPct: 54, note: 'hit + full price' },
  { label: 'Turn 3', cachedPct: 64, newPct: 34, note: 'hit + full price' },
]

const FORKS = ['extractMemories', 'promptSuggestion', 'autoDream']

export function CacheAnimation() {
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const phaseIdx  = PHASES.indexOf(phase)
  const showForks = phase === 'forks'
  const visibleTurns =
    phase === 'turn1' ? 1 :
    phase === 'turn2' ? 2 :
    phaseIdx >= PHASES.indexOf('turn3') && !showForks ? 3 : 0

  return (
    <div key={cycle} className="h-full flex flex-col justify-between py-6 px-4">

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* Turn-by-turn view */}
          {!showForks && phaseIdx >= PHASES.indexOf('turn1') && (
            <motion.div key="turns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Legend */}
              <div className="flex gap-4 mb-4 text-[9px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-900 border border-blue-700 inline-block" />
                  cached (0.1×)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-950 border border-amber-700 inline-block" />
                  new messages (full price)
                </span>
              </div>

              <div className="space-y-3">
                {TURNS.slice(0, visibleTurns).map((t) => (
                  <motion.div key={t.label}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[10px] text-zinc-500 font-mono w-12 shrink-0">{t.label}</span>
                    <div className="flex-1 flex h-6 rounded overflow-hidden">
                      {t.cachedPct > 0 && (
                        <div style={{ width: `${t.cachedPct}%` }}
                          className="bg-blue-950/70 border-r border-blue-700/50 flex items-center justify-center text-[9px] text-blue-400 font-mono">
                          0.1×
                        </div>
                      )}
                      <div style={{ width: `${t.newPct}%` }}
                        className="bg-amber-950/60 flex items-center justify-center text-[9px] text-amber-400 font-mono">
                        full
                      </div>
                      <div className="w-2 shrink-0 bg-amber-500/70" title="cache marker" />
                    </div>
                    <span className="text-[9px] text-zinc-600 w-24 shrink-0">{t.note}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Fork sharing view */}
          {showForks && (
            <motion.div key="forks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-[10px] text-zinc-500 font-mono mb-4">after each main turn</div>

              {/* Main conversation */}
              <div className="flex justify-center mb-1">
                <div className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-5 py-2 text-xs text-zinc-300">
                  main conversation (turn N)
                </div>
              </div>

              {/* Slot */}
              <div className="flex flex-col items-center gap-1 mb-1">
                <div className="w-px h-4 bg-zinc-700" />
                <div className="rounded border border-amber-700/50 bg-amber-950/20 px-3 py-1 text-[10px] font-mono text-amber-400">
                  saveCacheSafeParams()
                </div>
                <div className="flex gap-6">
                  {FORKS.map(() => (
                    <div key={Math.random()} className="w-px h-4 bg-zinc-700" />
                  ))}
                </div>
              </div>

              {/* Forks */}
              <div className="flex gap-2">
                {FORKS.map((name, i) => (
                  <motion.div key={name}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 rounded-lg border border-blue-800 bg-blue-950/30 px-2 py-2.5 text-center"
                  >
                    <div className="text-[9px] font-mono text-zinc-400 mb-1.5 leading-tight">{name}</div>
                    <div className="text-[10px] text-blue-300 font-semibold">cache HIT</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">0.1× cost</div>
                  </motion.div>
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
              className="text-zinc-600 text-xs">prefix-based prompt caching</motion.p>
          )}
          {phase === 'turn1' && (
            <motion.p key="t1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">first turn — all new · cache marker written at the tail</motion.p>
          )}
          {phase === 'turn2' && (
            <motion.p key="t2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">turn 2 — prior messages are a cache hit · only new messages cost full price</motion.p>
          )}
          {phase === 'turn3' && (
            <motion.p key="t3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">cost per turn scales with new messages only — not the full history</motion.p>
          )}
          {phase === 'forks' && (
            <motion.p key="fk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">all forks share the same prefix — each pays full price only for its own small new prompt</motion.p>
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
