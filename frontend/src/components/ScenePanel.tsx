import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getContent, parseContent } from '../content'
import { theme } from '../theme'
import type { PanelDef } from '../types'
import { DiagramCanvas } from './DiagramCanvas'
import { AsyncGeneratorAnimation } from './AsyncGeneratorAnimation'
import { TranscriptAnimation } from './TranscriptAnimation'
import { FlowOverviewPanel } from './FlowOverviewPanel'
import { AgentToolAnimation } from './AgentToolAnimation'

interface Props {
  panel: PanelDef
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string, defaultPanel?: number) => void
}

const md = theme.panel.md

export function ScenePanel({ panel, onNavigateScene, onOpenContent }: Props) {
  const raw = panel.contentKey ? getContent(panel.contentKey) : null
  const parsed = raw ? parseContent(raw) : null

  if (panel.animation === 'flow-overview')
    return <FlowOverviewPanel onNavigateScene={onNavigateScene} onOpenContent={onOpenContent} />
  if (panel.animation === 'agent-tool-flow')
    return <AgentToolAnimation />

  if (!panel.animation && !panel.diagram && !parsed)
    return <p className="text-zinc-500 p-8">Content not found: {panel.contentKey}</p>

  if (panel.layout === 'split' && panel.animation) {
    const AnimComp = panel.animation === 'async-generator' ? AsyncGeneratorAnimation : null
    if (AnimComp) return (
      <div className="absolute inset-0 flex">
        <div className="w-1/2 border-r border-zinc-800 p-8 overflow-hidden">
          <AnimComp />
        </div>
        <div className="w-1/2 overflow-y-auto">
          <div className="px-10 py-10">
            <h1 className="text-white font-bold text-2xl mb-8">{parsed?.title}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              h2:         ({ children }) => <h2 className={md.h2}>{children}</h2>,
              h3:         ({ children }) => <h3 className={md.h3}>{children}</h3>,
              p:          ({ children }) => <p className={md.p}>{children}</p>,
              ul:         ({ children }) => <ul className={md.ul}>{children}</ul>,
              ol:         ({ children }) => <ol className={md.ol}>{children}</ol>,
              li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong:     ({ children }) => <strong className={md.strong}>{children}</strong>,
              blockquote: ({ children }) => <blockquote className={md.blockquote}>{children}</blockquote>,
              pre:        ({ children }) => <>{children}</>,
              code: ({ children, className }) =>
                className?.includes('language-')
                  ? <code className={`block ${md.codeBlock}`}>{children}</code>
                  : <code className={md.codeInline}>{children}</code>,
              table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
              th: ({ children }) => <th className={md.th}>{children}</th>,
              td: ({ children }) => <td className={md.td}>{children}</td>,
            }}>{parsed?.body ?? ''}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      {panel.animation === 'transcript' && (
        <div className="border-b border-zinc-800" style={{ height: 300 }}>
          <TranscriptAnimation onOpenContent={onOpenContent} />
        </div>
      )}
      {panel.animation === 'async-generator' && (
        <div className="border-b border-zinc-800" style={{ height: 300 }}>
          <AsyncGeneratorAnimation />
        </div>
      )}
      {panel.diagram && !panel.animation && (
        <div className="border-b border-zinc-800">
          <DiagramCanvas diagram={panel.diagram} />
        </div>
      )}
      <div className="max-w-3xl mx-auto px-12 pt-8 pb-8">
        <h1 className="text-white font-bold text-xl mb-6">{parsed?.title}</h1>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2:         ({ children }) => <h2 className={md.h2}>{children}</h2>,
            h3:         ({ children }) => <h3 className={md.h3}>{children}</h3>,
            p:          ({ children }) => <p className={md.p}>{children}</p>,
            ul:         ({ children }) => <ul className={md.ul}>{children}</ul>,
            ol:         ({ children }) => <ol className={md.ol}>{children}</ol>,
            li:         ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong:     ({ children }) => <strong className={md.strong}>{children}</strong>,
            blockquote: ({ children }) => <blockquote className={md.blockquote}>{children}</blockquote>,
            pre:        ({ children }) => <>{children}</>,
            code: ({ children, className }) =>
              className?.includes('language-')
                ? <code className={`block ${md.codeBlock}`}>{children}</code>
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
          {parsed?.body ?? ''}
        </ReactMarkdown>
      </div>
    </div>
  )
}
