import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { SceneDef, BoxDef } from '../types'
import { Box } from './Box'
import { Arrow } from './Arrow'
import { Region } from './Region'
import { ScenePanel } from './ScenePanel'

interface Props {
  scene: SceneDef
  direction: number
  editMode?: boolean
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string) => void
}

export function Scene({ scene, direction, editMode, onNavigateScene, onOpenContent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [bubbleId, setBubbleId] = useState<string | null>(null)
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [saving, setSaving] = useState(false)
  const [activePanel, setActivePanel] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setDraggedPositions({})
    setActivePanel(null)
  }, [scene.id])

  const effectiveBoxes: BoxDef[] = scene.boxes.map(box => ({
    ...box,
    ...(draggedPositions[box.id] ?? {}),
  }))

  const handleDragEnd = (boxId: string, dx: number, dy: number) => {
    if (!size.width || !size.height) return
    const base = draggedPositions[boxId] ?? scene.boxes.find(b => b.id === boxId)!
    setDraggedPositions(prev => ({
      ...prev,
      [boxId]: {
        x: Math.max(0, Math.min(100, base.x + (dx / size.width) * 100)),
        y: Math.max(0, Math.min(100, base.y + (dy / size.height) * 100)),
      },
    }))
  }

  const hasDragged = Object.keys(draggedPositions).length > 0

  const saveLayout = async () => {
    setSaving(true)
    const positions: Record<string, { x: number; y: number }> = {}
    for (const box of effectiveBoxes) {
      positions[box.id] = { x: box.x, y: box.y }
    }
    try {
      await fetch('/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id, positions }),
      })
      setDraggedPositions({})
    } finally {
      setSaving(false)
    }
  }

  const hasPanels = scene.panels && scene.panels.length > 0

  return (
    <motion.div
      key={scene.id}
      className="absolute inset-0 flex flex-col"
      initial={{ x: direction * 100 + '%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100 + '%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      {hasPanels && (
        <div className="flex shrink-0 border-b border-zinc-800 px-4">
          <button
            onClick={() => setActivePanel(null)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              activePanel === null
                ? 'text-white border-amber-500'
                : 'text-zinc-500 hover:text-zinc-300 border-transparent'
            }`}
          >
            Diagram
          </button>
          {scene.panels!.map((panel, i) => (
            <button
              key={i}
              onClick={() => setActivePanel(i)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                activePanel === i
                  ? 'text-white border-amber-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {activePanel !== null && scene.panels ? (
          <ScenePanel panel={scene.panels[activePanel]} />
        ) : (
          <div
            ref={containerRef}
            className="relative w-full h-full"
            onClick={() => { if (!editMode) setBubbleId(null) }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {scene.regions?.map(region => (
                <Region key={region.label} region={region} boxes={effectiveBoxes} containerSize={size} />
              ))}
              {scene.arrows.map(arrow => (
                <Arrow key={`${arrow.from}-${arrow.to}`} arrow={arrow} boxes={effectiveBoxes} containerSize={size} />
              ))}
            </svg>
            {effectiveBoxes.map(box => (
              <Box
                key={box.id}
                box={box}
                editMode={editMode}
                bubbleOpen={bubbleId === box.id}
                onToggleBubble={() => setBubbleId(bubbleId === box.id ? null : box.id)}
                onNavigateScene={onNavigateScene}
                onOpenContent={onOpenContent}
                onDragEnd={handleDragEnd}
              />
            ))}
            {editMode && hasDragged && (
              <button
                onClick={saveLayout}
                disabled={saving}
                className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Layout'}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
