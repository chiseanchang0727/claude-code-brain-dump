import { theme } from '../theme'
import type { HistoryItem } from '../types'

interface Props {
  history: HistoryItem[]
  popTo: (position: number) => void
}

export function SceneNav({ history, popTo }: Props) {
  return (
    <div className={`flex items-center gap-1.5 px-8 py-4 ${theme.nav.container}`}>
      {history.map((item, i) => {
        const isLast = i === history.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className={theme.nav.separator}>→</span>}
            {isLast ? (
              <span className={theme.nav.crumbActive}>{item.crumb}</span>
            ) : (
              <button onClick={() => popTo(i)} className={theme.nav.crumbLink}>
                {item.crumb}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
