import { useState, useEffect, useCallback } from 'react'
import type { SceneDef, HistoryItem } from '../types'

export function useSceneNav(scenes: SceneDef[]) {
  const [history, setHistory] = useState<HistoryItem[]>([
    { type: 'scene', idx: 0, crumb: scenes[0].crumb },
  ])

  const current = history[history.length - 1]

  const pushScene = useCallback((sceneId: string) => {
    const idx = scenes.findIndex(s => s.id === sceneId)
    if (idx !== -1)
      setHistory(h => [...h, { type: 'scene', idx, crumb: scenes[idx].crumb }])
  }, [scenes])

  const pushContent = useCallback((contentKey: string, crumb: string) => {
    setHistory(h => [...h, { type: 'content', contentKey, crumb }])
  }, [])

  const popTo = useCallback((position: number) => {
    setHistory(h => h.slice(0, position + 1))
  }, [])

  const popOne = useCallback(() => {
    setHistory(h => h.length > 1 ? h.slice(0, -1) : h)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'Escape') popOne()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [popOne])

  return { current, history, pushScene, pushContent, popTo }
}
