import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

type Phase = 'running' | 'flying' | 'handling'

const ENTRIES = [
  'assistant · text',
  'tool_use · Bash',
  'tool_result · ok',
  'tool_use · Read',
  'tool_result · file',
  'assistant · text',
]

export function AsyncGeneratorAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [phase, setPhase] = useState<Phase>('running')
  const [transcript, setTranscript] = useState<string[]>([])
  const countRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setWidth(el.clientWidth))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const PHASES: Phase[] = ['running', 'flying', 'handling']
    const DURATIONS = [2000, 1600, 1300]
    let i = 0

    const next = () => {
      if (cancelled) return
      i = (i + 1) % 3
      const p = PHASES[i]
      setPhase(p)
      if (p === 'handling') {
        const entry = ENTRIES[countRef.current % ENTRIES.length]
        countRef.current++
        setTranscript(prev => [...prev.slice(-4), entry])
      }
      timer = setTimeout(next, DURATIONS[i])
    }

    timer = setTimeout(next, DURATIONS[0])
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const isRunning = phase === 'running' || phase === 'flying'
  const isHandling = phase === 'handling'

  // Pixel offsets for the flying message, centered at 50%
  const msgOffset = width * 0.17

  return (
    <div ref={containerRef} className="relative w-full h-full">

      {/* ── QueryEngine (left) ── */}
      <div className="absolute" style={{ left: '32%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <motion.div
          animate={isHandling
            ? { borderColor: '#c2410c', boxShadow: '0 0 18px rgba(194,65,12,0.4)' }
            : { borderColor: '#7c2d12', boxShadow: 'none' }}
          transition={{ duration: 0.3 }}
          className="px-4 py-2.5 rounded-xl border-2 text-center w-40 bg-orange-950/60"
        >
          <div className="text-sm font-semibold text-orange-100">QueryEngine</div>
          <div className="text-[10px] text-orange-500 mt-1">
            {isHandling ? 'handling…' : 'for await ·  waiting'}
          </div>
        </motion.div>
      </div>

      {/* transcript.jsonl */}
      <div className="absolute" style={{ left: '32%', top: 'calc(30% + 46px)', transform: 'translateX(-50%)' }}>
        <div className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2">
          <div className="text-[8px] text-zinc-600 mb-1.5 font-mono uppercase tracking-wider">
            transcript.jsonl
          </div>
          <div className="min-h-[56px] space-y-0.5">
            <AnimatePresence initial={false}>
              {transcript.map((entry, i) => (
                <motion.div
                  key={i + entry}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[9px] font-mono text-green-400 truncate"
                >
                  {entry}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Flying message ── */}
      {width > 0 && (
        <AnimatePresence>
          {phase === 'flying' && (
            <motion.div
              className="absolute"
              style={{ left: '50%', top: '30%', transform: 'translateY(-50%)' }}
              initial={{ x: msgOffset, opacity: 0 }}
              animate={{ x: -msgOffset, opacity: [0, 1, 1, 0.6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.3, ease: 'easeInOut' }}
            >
              <div style={{ transform: 'translateX(-50%)' }}
                className="px-3 py-1 rounded-full bg-zinc-700 border border-zinc-500 text-[11px] text-zinc-200 whitespace-nowrap shadow-lg">
                message
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── query loop (right) ── */}
      <div className="absolute" style={{ left: '68%', top: '30%', transform: 'translate(-50%, -50%)' }}>
        <motion.div
          animate={isRunning ? { borderColor: '#52525b' } : { borderColor: '#27272a' }}
          transition={{ duration: 0.3 }}
          className="px-4 py-2.5 rounded-xl border-2 text-center w-40 bg-zinc-800"
        >
          <div className={`text-sm font-semibold transition-colors duration-300 ${isRunning ? 'text-zinc-100' : 'text-zinc-500'}`}>
            query loop
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <AnimatePresence initial={false}>
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{ rotate: { duration: 0.8, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.2 } }}
                  className="w-3 h-3 rounded-full border-2 border-zinc-600 border-t-zinc-300 shrink-0"
                />
              )}
            </AnimatePresence>
            <span className={`text-[10px] transition-colors duration-300 ${isRunning ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {phase === 'running' ? 'running…' : phase === 'flying' ? 'yielding…' : 'waiting'}
            </span>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
