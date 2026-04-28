import { useState, useEffect } from 'react'

export function usePhasePlayer<T extends string>(
  phases: readonly T[],
  durations: number | number[] = 2000
) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)

  const getDuration = (idx: number) =>
    Array.isArray(durations) ? (durations[idx] ?? 2000) : durations

  // Auto-advance — resets whenever phaseIdx changes (including manual clicks)
  useEffect(() => {
    if (!autoPlay) return
    const t = setTimeout(() => {
      if (phaseIdx < phases.length - 1) {
        setPhaseIdx(i => i + 1)
      } else {
        setPhaseIdx(0)
        setCycle(c => c + 1)
      }
    }, getDuration(phaseIdx))
    return () => clearTimeout(t)
  }, [autoPlay, phaseIdx, cycle])

  const prev  = () => setPhaseIdx(i => Math.max(0, i - 1))
  const next  = () => {
    if (phaseIdx < phases.length - 1) {
      setPhaseIdx(i => i + 1)
    } else {
      setPhaseIdx(0)
      setCycle(c => c + 1)
    }
  }
  const reset = () => { setPhaseIdx(0); setCycle(c => c + 1) }

  return { phaseIdx, phase: phases[phaseIdx], cycle, prev, next, reset, autoPlay, setAutoPlay }
}
