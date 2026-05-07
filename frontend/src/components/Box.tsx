import { useMotionValue } from 'framer-motion'
import { motion, AnimatePresence } from 'framer-motion'
import type { BoxDef, BoxVariant } from '../types'
import { theme } from '../theme'

interface Props {
  box: BoxDef
  editMode?: boolean
  bubbleOpen: boolean
  onToggleBubble: () => void
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string, defaultPanel?: number) => void
  onDragEnd?: (boxId: string, dx: number, dy: number) => void
}

export function Box({ box, editMode, bubbleOpen, onToggleBubble, onNavigateScene, onOpenContent, onDragEnd }: Props) {
  const v: BoxVariant = box.variant ?? 'default'
  const b = theme.box.border[v]

  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)

  const handleClick = (e: React.MouseEvent) => {
    if (editMode) return
    e.stopPropagation()
    if (box.navigateTo) onNavigateScene(box.navigateTo)
    else if (box.detail) onOpenContent(box.detail.contentKey, box.label, box.detail.defaultPanel)
    else if (box.description) onToggleBubble()
  }

  const handleDragEnd = (_: any, info: any) => {
    onDragEnd?.(box.id, info.offset.x, info.offset.y)
    dragX.set(0)
    dragY.set(0)
  }

  const isInteractive = !editMode && (box.description || box.navigateTo || box.detail)

  return (
    // Outer div: CSS percentage positioning + centering
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${box.x}%`, top: `${box.y}%`, zIndex: bubbleOpen ? 50 : undefined }}
    >
      <motion.div
        onClick={handleClick}
        drag={editMode}
        dragMomentum={false}
        dragElastic={0}
        style={{ x: dragX, y: dragY }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={editMode ? { scale: 1.03 } : isInteractive ? { scale: 1.06 } : undefined}
        className={`select-none px-4 py-2.5 rounded-xl border-2 text-center w-40 transition-colors duration-200
          ${editMode ? 'cursor-grab active:cursor-grabbing' : isInteractive ? 'cursor-pointer' : 'cursor-default'}
          ${box.dashed ? 'border-dashed' : ''}
          ${theme.box.bg[v]} ${b.idle} ${b.hover}`}
      >
        <div className="text-sm font-semibold leading-tight">{box.label}</div>
        {box.sublabel && (
          <div className={`text-[10px] mt-1 leading-tight ${theme.box.sublabel[v]}`}>
            {box.sublabel}
          </div>
        )}

        {/* Chat bubble */}
        <AnimatePresence>
          {bubbleOpen && box.description && (
            <motion.div
              className={`absolute bottom-[calc(100%+10px)] z-50 w-56 pointer-events-none
                ${box.x < 20 ? 'left-0' : box.x > 80 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-zinc-800 border border-zinc-600 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 leading-relaxed shadow-xl text-left">
                {box.description}
              </div>
              <div className={`absolute -bottom-[6px] w-3 h-3 bg-zinc-800 border-r border-b border-zinc-600 rotate-45
                ${box.x < 20 ? 'left-4' : box.x > 80 ? 'right-4' : 'left-1/2 -translate-x-1/2'}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
