import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
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
  onOpenContent: (contentKey: string, crumb: string, defaultPanel?: number) => void
}

export function Scene({ scene, direction, editMode, onNavigateScene, onOpenContent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [bubbleId, setBubbleId] = useState<string | null>(null)
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [saving, setSaving] = useState(false)
  const hasPanels = scene.panels && scene.panels.length > 0
  const [activePanel, setActivePanel] = useState<number | null>(hasPanels ? 0 : null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [activePanel])

  useEffect(() => {
    setDraggedPositions({})
    setActivePanel(scene.panels && scene.panels.length > 0 ? 0 : null)
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

  return (
    <motion.div
      key={scene.id}
      className="absolute inset-0 flex flex-col"
      initial={{ x: direction * 100 + '%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100 + '%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      {hasPanels && !scene.hideDiagramTab && (
        <div className="flex shrink-0 border-b border-zinc-800 px-4">
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
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {activePanel !== null && scene.panels ? (
          <ScenePanel panel={scene.panels[activePanel]} onNavigateScene={onNavigateScene} onOpenContent={onOpenContent} />
        ) : scene.sideSteps ? (
          <div className="absolute inset-0 flex">
            <div ref={containerRef} className="relative flex-1 h-full" onClick={() => { if (!editMode) setBubbleId(null) }}>
              {effectiveBoxes.filter(b => !b.elevated).map(box => (
                <Box key={box.id} box={box} editMode={editMode} bubbleOpen={bubbleId === box.id}
                  onToggleBubble={() => setBubbleId(bubbleId === box.id ? null : box.id)}
                  onNavigateScene={onNavigateScene} onOpenContent={onOpenContent} onDragEnd={handleDragEnd} />
              ))}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                {scene.regions?.map(region => (
                  <Region key={region.label} region={region} boxes={effectiveBoxes} containerSize={size} />
                ))}
                {scene.arrows.map(arrow => (
                  <Arrow key={`${arrow.from}-${arrow.to}`} arrow={arrow} boxes={effectiveBoxes} containerSize={size} />
                ))}
                {scene.sideSteps?.filter(s => s.fromBoxId).map((step, i) => {
                  const box = effectiveBoxes.find(b => b.id === step.fromBoxId)
                  if (!box || !size.width || !size.height) return null
                  const x1 = size.width * (box.x / 100) + 83
                  const y  = size.height * (step.y / 100)
                  return <line key={i} x1={x1} y1={y} x2={size.width} y2={y}
                    stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
                })}
              </svg>
              {effectiveBoxes.filter(b => b.elevated).map(box => (
                <Box key={box.id} box={box} editMode={editMode} bubbleOpen={bubbleId === box.id}
                  onToggleBubble={() => setBubbleId(bubbleId === box.id ? null : box.id)}
                  onNavigateScene={onNavigateScene} onOpenContent={onOpenContent} onDragEnd={handleDragEnd} />
              ))}
            </div>
            <div className="w-80 border-l border-zinc-800 relative shrink-0">
              {scene.sideSteps.map((step, i) => (
                <div key={i} className="absolute left-0 right-2 -translate-y-1/2 flex items-center" style={{ top: `${step.y}%` }}>
                  <div className="w-8 shrink-0 border-t border-dashed border-zinc-600" />
                  <div className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 flex items-start gap-3">
                    <span className="text-xs font-mono text-zinc-600 shrink-0 mt-0.5">{i + 1}</span>
                    <div className="text-sm text-zinc-300 min-w-0">
                      <ReactMarkdown components={{
                        p:      ({ children }) => <p className="text-sm text-zinc-300">{children}</p>,
                        ul:     ({ children }) => <ul className="mt-1 space-y-0.5 list-disc list-inside">{children}</ul>,
                        li:     ({ children }) => <li className="text-xs text-zinc-400">{children}</li>,
                        strong: ({ children }) => <strong className="text-zinc-200 font-semibold">{children}</strong>,
                        code:   ({ children }) => <code className="text-xs bg-zinc-800 text-zinc-300 px-1 rounded">{children}</code>,
                      }}>
                        {step.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full h-full"
            onClick={() => { if (!editMode) setBubbleId(null) }}
          >
            {effectiveBoxes.filter(b => !b.elevated).map(box => (
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
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              {scene.regions?.map(region => (
                <Region key={region.label} region={region} boxes={effectiveBoxes} containerSize={size} />
              ))}
              {scene.arrows.map(arrow => (
                <Arrow key={`${arrow.from}-${arrow.to}`} arrow={arrow} boxes={effectiveBoxes} containerSize={size} />
              ))}
            </svg>
            {effectiveBoxes.filter(b => b.elevated).map(box => (
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
