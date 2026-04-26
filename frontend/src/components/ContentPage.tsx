import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getContent, parseContent } from '../content'
import { theme } from '../theme'

interface Props {
  contentKey: string
  direction: number
}

const md = theme.panel.md

export function ContentPage({ contentKey, direction }: Props) {
  const raw = getContent(contentKey)
  const parsed = raw ? parseContent(raw) : null

  return (
    <motion.div
      key={contentKey}
      className="absolute inset-0 overflow-y-auto"
      initial={{ x: direction * 100 + '%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100 + '%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
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
    </motion.div>
  )
}
