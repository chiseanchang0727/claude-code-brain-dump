import React from 'react'
import { motion } from 'framer-motion'

type NavAction =
  | { type: 'scene'; sceneId: string }
  | { type: 'content'; contentKey: string; crumb: string }

interface Props {
  onNavigateScene: (sceneId: string) => void
  onOpenContent: (contentKey: string, crumb: string, defaultPanel?: number) => void
}

const ROWS: {
  left: React.ReactNode
  num: string
  label: string
  sublabel: string
  desc: string
  nav: NavAction
}[] = [
  {
    left: (
      <div className="font-mono text-xs">
        <span className="text-zinc-500">$ </span>
        <span className="text-amber-400">claude</span>
      </div>
    ),
    num: '01',
    label: 'CLI Bootstrap',
    sublabel: 'cli.tsx',
    desc: 'Claude Code launches, loads your settings and project context, and gets ready.',
    nav: { type: 'content', contentKey: 'architecture-flow/cli', crumb: 'CLI Bootstrap' },
  },
  {
    left: (
      <div className="font-mono text-xs text-zinc-500">
        Parses flags, picks a mode<br />
        <span className="text-zinc-600">(interactive or one-shot)</span>
      </div>
    ),
    num: '02',
    label: 'Commander.js',
    sublabel: 'main.tsx',
    desc: 'Parses your command-line flags and routes to the right handler — interactive REPL or one-off task.',
    nav: { type: 'content', contentKey: 'architecture-flow/commander', crumb: 'Commander.js' },
  },
  {
    left: (
      <div className="flex items-start gap-2">
        <span className="text-amber-400 font-mono text-xs shrink-0 mt-0.5">❯</span>
        <span className="text-zinc-200 text-xs leading-relaxed">
          Add a loading spinner to the submit button
        </span>
      </div>
    ),
    num: '03',
    label: 'QueryEngine',
    sublabel: 'submitMessage()',
    desc: 'Your message is saved and a turn begins. History, tools, and instructions are assembled for the model.',
    nav: { type: 'scene', sceneId: 'query-engine-detail' },
  },
  {
    left: (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex gap-2">
          <span className="text-zinc-600">↳</span>
          <span className="text-zinc-500">Reading the submit button code</span>
        </div>
        <div className="flex gap-2">
          <span className="text-zinc-600">↳</span>
          <span className="text-zinc-500">Checking how styles are set up</span>
        </div>
        <div className="flex gap-2">
          <span className="text-green-600">↳</span>
          <span className="text-zinc-400">Adding the spinner and updating the button</span>
        </div>
        <div className="flex gap-2">
          <span className="text-blue-500">↳</span>
          <span className="text-zinc-400">Verifying the changes compile</span>
        </div>
      </div>
    ),
    num: '04',
    label: 'Query Loop',
    sublabel: 'query.ts',
    desc: "The model reads your message, uses tools to act on your code, and loops until it's done.",
    nav: { type: 'scene', sceneId: 'query-loop-detail' },
  },
  {
    left: (
      <div className="flex flex-col gap-1.5 text-xs">
        <p className="text-zinc-300 leading-relaxed">
          Done. The button now shows a spinner while submitting and disables itself to prevent double clicks.
        </p>
        <div className="flex gap-2 text-zinc-600 font-mono text-[10px] pt-1 border-t border-zinc-800">
          <span>3 turns</span>
          <span>·</span>
          <span>$0.008</span>
          <span>·</span>
          <span>4.2s</span>
        </div>
      </div>
    ),
    num: '05',
    label: 'Result Yielded',
    sublabel: 'cost · usage · duration',
    desc: 'The response is delivered to your terminal. Token count, cost, and elapsed time are recorded.',
    nav: { type: 'content', contentKey: 'architecture-flow/result', crumb: 'Result Yielded' },
  },
]

export function FlowOverviewPanel({ onNavigateScene, onOpenContent }: Props) {
  const handleNav = (nav: NavAction) => {
    if (nav.type === 'scene') onNavigateScene(nav.sceneId)
    else onOpenContent(nav.contentKey, nav.crumb)
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center px-8 py-8">
      <div className="w-full max-w-3xl flex flex-col gap-0">
        {ROWS.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3, ease: 'easeOut' }}
            className={`flex gap-6 items-start py-5 ${i < ROWS.length - 1 ? 'border-b border-zinc-800/60' : ''}`}
          >
            {/* Left: user-facing */}
            <div className="w-1/2 shrink-0">
              {row.left}
            </div>

            {/* Divider arrow */}
            <div className="shrink-0 flex items-center self-center text-zinc-700 text-sm">→</div>

            {/* Right: technical step — clickable */}
            <motion.div
              className="flex gap-3 flex-1 min-w-0 cursor-pointer group"
              onClick={() => handleNav(row.nav)}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex flex-col items-center pt-0.5" style={{ width: 20 }}>
                <span className="font-mono text-[9px] text-zinc-600 leading-none">{row.num}</span>
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">{row.label}</span>
                  <span className="font-mono text-[10px] text-zinc-600">{row.sublabel}</span>
                  <span className="text-zinc-700 text-xs group-hover:text-zinc-500 transition-colors">↗</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">{row.desc}</p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
