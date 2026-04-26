import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { SceneDef } from '../types'
import { Box } from './Box'
import { Arrow } from './Arrow'

interface Props {
  scene: SceneDef
  direction: number
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string) => void
}

export function Scene({ scene, direction, onNavigateScene, onOpenContent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      key={scene.id}
      className="absolute inset-0"
      initial={{ x: direction * 100 + '%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100 + '%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <div ref={containerRef} className="relative w-full h-full">
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          {scene.arrows.map(arrow => (
            <Arrow key={`${arrow.from}-${arrow.to}`} arrow={arrow} boxes={scene.boxes} containerSize={size} />
          ))}
        </svg>
        {scene.boxes.map(box => (
          <Box key={box.id} box={box} onNavigateScene={onNavigateScene} onOpenContent={onOpenContent} />
        ))}
      </div>
    </motion.div>
  )
}
