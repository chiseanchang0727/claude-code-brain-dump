import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getContent, parseContent } from '../content'
import { contentPanels } from '../data/contentPanels'
import { AsyncGeneratorAnimation } from './AsyncGeneratorAnimation'
import { TranscriptAnimation } from './TranscriptAnimation'
import { theme } from '../theme'

interface Props {
  contentKey: string
  direction: number
  defaultPanel?: number
}

const md = theme.panel.md

function PanelContent({ animation }: { animation?: string }) {
  if (animation === 'transcript') return <TranscriptAnimation />
  if (animation === 'async-generator') return <AsyncGeneratorAnimation />
  return null
}

export function ContentPage({ contentKey, direction, defaultPanel }: Props) {
  const raw = getContent(contentKey)
  const parsed = raw ? parseContent(raw) : null
  const panels = contentPanels[contentKey] ?? []
  const hasPanels = panels.length > 0
  const [activePanel, setActivePanel] = useState<number | null>(defaultPanel ?? null)

  return (
    <motion.div
      key={contentKey}
      className="absolute inset-0 flex flex-col"
      initial={{ x: direction * 100 + '%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100 + '%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      {hasPanels && (
        <div className="flex shrink-0 border-b border-zinc-800 px-4">
          {panels.map((panel, i) => (
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
            Description
          </button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {activePanel !== null ? (
          <div className="w-full h-full p-8">
            <PanelContent animation={panels[activePanel].animation} />
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <div className="max-w-3xl mx-auto px-12 py-10">
              {parsed ? (
                <>
                  <h1 className="text-white font-bold text-2xl mb-8">{parsed.title}</h1>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2:         ({ children }) => <h2 className={`${md.h2} text-base mt-8 mb-3`}>{children}</h2>,
                      h3:         ({ children }) => <h3 className={`${md.h3} mt-6 mb-2`}>{children}</h3>,
                      p:          ({ children }) => <p className={`${md.p} text-base`}>{children}</p>,
                      ul:         ({ children }) => <ul className={`${md.ul} text-base`}>{children}</ul>,
                      ol:         ({ children }) => <ol className={`${md.ol} text-base`}>{children}</ol>,
                      li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong:     ({ children }) => <strong className={md.strong}>{children}</strong>,
                      blockquote: ({ children }) => <blockquote className={md.blockquote}>{children}</blockquote>,
                      pre:        ({ children }) => <>{children}</>,
                      code: ({ children, className }) =>
                        className?.includes('language-')
                          ? <code className={`block ${md.codeBlock} text-sm`}>{children}</code>
                          : <code className={md.codeInline}>{children}</code>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="w-full text-sm border-collapse">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th className={md.th}>{children}</th>,
                      td: ({ children }) => <td className={md.td}>{children}</td>,
                    }}
                  >
                    {parsed.body}
                  </ReactMarkdown>
                </>
              ) : (
                <p className="text-zinc-500">Content not found: {contentKey}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
