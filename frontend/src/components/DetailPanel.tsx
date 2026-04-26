import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { DetailDef } from '../types'
import { getContent, parseContent } from '../content'
import { theme } from '../theme'

interface Props {
  detail: DetailDef | null
  onClose: () => void
}

const md = theme.panel.md

export function DetailPanel({ detail, onClose }: Props) {
  const raw = detail ? getContent(detail.contentKey) : null
  const parsed = raw ? parseContent(raw) : null

  return (
    <AnimatePresence>
      {detail && parsed && (
        <>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={`absolute inset-x-[15%] top-[8%] bottom-[8%] flex flex-col z-20 rounded-2xl shadow-2xl ${theme.panel.bg}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* Header */}
            <div className={`flex items-start justify-between px-8 py-5 shrink-0 ${theme.panel.header}`}>
              <h3 className={`pr-4 ${theme.panel.title}`}>{parsed.title}</h3>
              <button onClick={onClose} className={`text-lg leading-none mt-0.5 shrink-0 ${theme.panel.close}`}>✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
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
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className={md.th}>{children}</th>,
                  td: ({ children }) => <td className={md.td}>{children}</td>,
                }}
              >
                {parsed.body}
              </ReactMarkdown>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
