import { useRef, useEffect, useState } from 'react'
import type { PanelDiagram } from '../types'
import { Arrow } from './Arrow'
import { Region } from './Region'
import { Box } from './Box'

interface Props {
  diagram: PanelDiagram
}

const noop = () => {}

export function DiagramCanvas({ diagram }: Props) {
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

  const height = diagram.height ?? 260

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {diagram.regions?.map(region => (
          <Region key={region.label} region={region} boxes={diagram.boxes} containerSize={size} />
        ))}
        {diagram.arrows.map(arrow => (
          <Arrow key={`${arrow.from}-${arrow.to}`} arrow={arrow} boxes={diagram.boxes} containerSize={size} />
        ))}
      </svg>
      {diagram.boxes.map(box => (
        <Box
          key={box.id}
          box={box}
          bubbleOpen={false}
          onToggleBubble={noop}
          onNavigateScene={noop}
          onOpenContent={noop}
        />
      ))}
    </div>
  )
}
