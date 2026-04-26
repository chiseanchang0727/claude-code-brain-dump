import { motion } from 'framer-motion'
import type { BoxDef, BoxVariant } from '../types'
import { theme } from '../theme'

interface Props {
  box: BoxDef
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string) => void
}

export function Box({ box, onNavigateScene, onOpenContent }: Props) {
  const v: BoxVariant = box.variant ?? 'default'

  const handleClick = () => {
    if (box.navigateTo) onNavigateScene(box.navigateTo)
    else if (box.detail) onOpenContent(box.detail.contentKey, box.label)
  }

  const b = theme.box.border[v]

  return (
    <motion.div
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.06 }}
      style={{ left: `${box.x}%`, top: `${box.y}%` }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none
        px-4 py-2.5 rounded-xl border-2 text-center w-40 transition-colors duration-200
        ${theme.box.bg[v]} ${b.idle} ${b.hover}`}
    >
      <div className="text-sm font-semibold leading-tight">{box.label}</div>
      {box.sublabel && (
        <div className={`text-[10px] mt-1 leading-tight ${theme.box.sublabel[v]}`}>
          {box.sublabel}
        </div>
      )}
    </motion.div>
  )
}
