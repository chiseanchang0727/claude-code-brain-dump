import { useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { scenes } from './data/scenes'
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
              onNavigateScene={pushScene}
              onOpenContent={pushContent}
            />
          ) : (
            <ContentPage
              key={nodeKey}
              contentKey={current.contentKey}
              direction={direction}
            />
          )}
        </AnimatePresence>
      </div>
      <div className={`px-8 py-3 ${theme.app.footer}`}>
        Click a box to read · ← Esc to go back
      </div>
    </div>
  )
}
