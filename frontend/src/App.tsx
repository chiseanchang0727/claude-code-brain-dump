import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { scenes } from './data/index'
import { useSceneNav } from './hooks/useSceneNav'
import { Scene } from './components/Scene'
import { ContentPage } from './components/ContentPage'
import { SceneNav } from './components/SceneNav'
import { theme } from './theme'

export default function App() {
  const { current, history, pushScene, pushContent, popTo } = useSceneNav(scenes)
  const prevLengthRef = useRef(history.length)
  const direction = history.length >= prevLengthRef.current ? 1 : -1
  prevLengthRef.current = history.length

  const [editMode, setEditMode] = useState(false)

  const nodeKey = current.type === 'scene' ? `scene-${current.idx}` : `content-${current.contentKey}`

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${theme.app.bg}`}>
      <SceneNav history={history} popTo={popTo} />
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {current.type === 'scene' ? (
            <Scene
              key={nodeKey}
              scene={scenes[current.idx]}
              direction={direction}
              editMode={editMode}
              onNavigateScene={pushScene}
              onOpenContent={pushContent}
            />
          ) : (
            <ContentPage
              key={nodeKey}
              contentKey={current.contentKey}
              direction={direction}
              defaultPanel={current.type === 'content' ? current.defaultPanel : undefined}
            />
          )}
        </AnimatePresence>
      </div>
      <div className={`px-8 py-3 flex items-center justify-between ${theme.app.footer}`}>
        <span>{editMode ? 'Drag boxes to reposition · Save Layout when done' : 'Click a box to read · ← Esc to go back'}</span>
        {import.meta.env.DEV && (
          <button
            onClick={() => setEditMode(m => !m)}
            className={`text-xs px-3 py-1 rounded-md border transition-colors ${
              editMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
            }`}
          >
            {editMode ? 'Editing' : 'Edit Layout'}
          </button>
        )}
      </div>
    </div>
  )
}
