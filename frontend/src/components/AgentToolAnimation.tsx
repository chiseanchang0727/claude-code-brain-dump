import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePhasePlayer } from '../hooks/usePhasePlayer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { theme } from '../theme'

const md = theme.panel.md

const mdComponents = {
  h2:         ({ children }: any) => <h2 className={`${md.h2} text-sm mt-5 mb-2`}>{children}</h2>,
  h3:         ({ children }: any) => <h3 className={`${md.h3} text-xs mt-4 mb-1`}>{children}</h3>,
  p:          ({ children }: any) => <p className={`${md.p} text-xs`}>{children}</p>,
  ul:         ({ children }: any) => <ul className={`${md.ul} text-xs`}>{children}</ul>,
  ol:         ({ children }: any) => <ol className={`${md.ol} text-xs`}>{children}</ol>,
  li:         ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  strong:     ({ children }: any) => <strong className={md.strong}>{children}</strong>,
  blockquote: ({ children }: any) => <blockquote className={md.blockquote}>{children}</blockquote>,
  pre:        ({ children }: any) => <>{children}</>,
  code: ({ children, className }: any) =>
    className?.includes('language-')
      ? <code className={`block ${md.codeBlock} text-xs`}>{children}</code>
      : <code className={`${md.codeInline} text-[10px]`}>{children}</code>,
  table: ({ children }: any) => (
    <div className="mb-3">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: any) => <th className={`${md.th} px-2 py-2 text-left`}>{children}</th>,
  td: ({ children }: any) => <td className={`${md.td} px-2 py-2 leading-relaxed`}>{children}</td>,
}

const PHASES = ['idle', 'parent-convo', 'decision', 'fork-spawn', 'fork-inherit', 'fork-run', 'named-spawn', 'named-run'] as const
const PHASE_DURATIONS = [600, 2500, 2000, 1500, 3000, 3500, 3000, 3500]

type Scenario = 'fork' | 'named' | null

function getScenario(phase: string): Scenario {
  if (['fork-spawn', 'fork-inherit', 'fork-run'].includes(phase)) return 'fork'
  if (['named-spawn', 'named-run'].includes(phase)) return 'named'
  return null
}

const MOCK_MESSAGES = [
  { role: 'user',      text: 'read the config'        },
  { role: 'assistant', text: 'checking…'               },
  { role: 'user',      text: 'update timeout'          },
  { role: 'assistant', text: 'updating now'             },
]

type RightTab = 'agent-types' | 'when-to-fork'

const AGENT_TYPES_CONTENT = `## By Source

| Type | Source | Definition |
|---|---|---|
| Built-in | \`source: 'built-in'\` | Hardcoded in \`src/tools/AgentTool/built-in/\` |
| Custom | \`source: 'userSettings'\` / \`'projectSettings'\` / \`'policySettings'\` | User-defined \`.md\` files in \`.claude/agents/\` |
| Plugin | \`source: 'plugin'\` | From installed plugins |

## Built-in Agents

| Agent | subagent_type | Purpose |
|---|---|---|
| general-purpose | \`"general-purpose"\` | Default — research, code search, multi-step tasks |
| Explore | \`"Explore"\` | Fast codebase exploration — Glob, Grep, Read only |
| Plan | \`"Plan"\` | Software architect — designs implementation plans |
| claude-code-guide | \`"claude-code-guide"\` | Answers questions about Claude Code |

**Special cases:**
- \`worker\` — only in coordinator mode (swarm/multi-agent)
- \`fork\` — implicit fork when \`subagent_type\` omitted

## Resolution Order

1. Look up in \`activeAgents\` list
2. If not found and fork experiment on → implicit fork
3. If not found and fork off → fall back to \`general-purpose\`
`

const WHEN_TO_FORK_CONTENT = `*Organized from the prompt in \`src/tools/AgentTool/prompt.ts\`*

## Fork vs Named Subagent

| | Named Subagent | Fork |
|---|---|---|
| Call | \`subagent_type: "Explore"\` | Omit \`subagent_type\` |
| Context | Starts fresh — zero context | Inherits full parent conversation |
| Cache | Cold start (expensive) | Shares parent's prompt cache (cheap) |
| Prompt style | Full briefing needed | Short directive — it already knows |
| Use case | Specialized task (explore, plan, review) | "I don't need this output in my context" |

## Decision Rule

- **Yes, I need this output** → do it yourself (keep in context)
- **No, I don't need it** → fork (results stay out, notification when done)

## Use Cases

- **Research**: fork open-ended questions. Launch parallel forks for independent questions. A fork beats a fresh subagent — it inherits context and shares your cache.
- **Implementation**: prefer to fork implementation work that requires more than a couple of edits. Do research before jumping to implementation.

## Rules

**Forks are cheap** — share your prompt cache. Don't set \`model\` on a fork — a different model can't reuse the parent's cache. Pass a short \`name\` so the user can see the fork in the teams panel.

**Don't peek.** The tool result includes an \`output_file\` path — do not Read or tail it unless the user explicitly asks. Reading mid-flight pulls the fork's tool noise into your context.

**Don't race.** After launching, you know nothing about what the fork found. Never fabricate or predict fork results. If the user asks before notification lands, tell them the fork is still running.

**Writing a fork prompt.** The fork inherits your context, so the prompt is a *directive* — what to do, not what the situation is. Be specific about scope.
`

export function AgentToolAnimation() {
  const [rightTab, setRightTab] = useState<RightTab>('when-to-fork')
  const { phase, cycle, prev, next, reset, autoPlay, setAutoPlay } =
    usePhasePlayer(PHASES, PHASE_DURATIONS)

  const scenario    = getScenario(phase)
  const showParent  = !['idle'].includes(phase)
  const showBranch  = scenario !== null
  const showInherit = ['fork-inherit', 'fork-run'].includes(phase)
  const showAgentCall = !['idle', 'parent-convo'].includes(phase)

  return (
    <div key={cycle} className="h-full flex">
      {/* Left side - Animation */}
      <div className="w-1/2 flex flex-col py-5 px-6 gap-4 border-r border-zinc-800 min-w-0">

        {/* Scenario pills */}
        <div className="flex gap-2 shrink-0">
          {[
            { key: 'fork',  label: 'fork agent',  color: 'border-blue-800 bg-blue-950/30 text-blue-400'   },
            { key: 'named', label: 'named agent', color: 'border-green-800 bg-green-950/30 text-green-400' },
          ].map(s => (
            <div key={s.key} className={`text-xs font-mono px-2 py-1 rounded border transition-all duration-300 ${
              scenario === s.key ? s.color : 'border-zinc-800/50 text-zinc-700'
            }`}>
              {s.label}
            </div>
          ))}
        </div>

      {/* Main area: trunk + agent box + annotation */}
      <div className="flex-1 min-h-0 flex gap-3">

        {/* Parent trunk */}
        <div className="shrink-0 flex flex-col" style={{ width: 120 }}>
          <AnimatePresence>
            {showParent && (
              <motion.div key="trunk" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col h-full">
                <div className="text-xs text-zinc-500 font-mono mb-2 pl-5">parent</div>
                <div className="relative flex-1">
                  <div className="absolute left-[7px] top-0 bottom-0 w-px bg-zinc-700" />

                  {/* Conversation messages */}
                  {MOCK_MESSAGES.map((m, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-start gap-2 mb-3">
                      <div className={`w-3.5 h-3.5 rounded-full border shrink-0 z-10 relative mt-0.5 ${
                        m.role === 'user' ? 'bg-zinc-800 border-zinc-600' : 'bg-green-950 border-green-700'
                      }`} />
                      <div>
                        <div className="text-xs text-zinc-500 font-mono leading-tight">{m.role}</div>
                        <div className="text-xs text-zinc-600 leading-tight">{m.text}</div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Agent tool call */}
                  <AnimatePresence>
                    {showAgentCall && (
                      <motion.div key="agent-call"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-start gap-2 mb-2">
                        <div className="w-3.5 h-3.5 rounded-full border bg-green-950 border-green-700 shrink-0 z-10 relative mt-0.5" />
                        <div>
                          <div className="text-xs text-zinc-500 font-mono leading-tight">assistant</div>
                          <AnimatePresence mode="wait">
                            {scenario === 'fork' && (
                              <motion.div key="fork-call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="mt-0.5 text-[11px] font-mono border border-blue-800 rounded px-1.5 py-0.5 text-blue-400 leading-tight">
                                Agent()
                              </motion.div>
                            )}
                            {scenario === 'named' && (
                              <motion.div key="named-call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="mt-0.5 text-[11px] font-mono border border-green-800 rounded px-1.5 py-0.5 text-green-400 leading-tight">
                                Agent(<br />
                                &nbsp;subagent_type=…<br />
                                )
                              </motion.div>
                            )}
                            {!scenario && (
                              <motion.div key="q-call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="mt-0.5 text-[11px] font-mono border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-500 leading-tight">
                                Agent(…)
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Branch point */}
                  <AnimatePresence>
                    {showBranch && (
                      <motion.div key="bp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center mt-1">
                        <div className={`w-3.5 h-3.5 rounded-full border shrink-0 z-10 relative ${
                          scenario === 'fork' ? 'bg-blue-900 border-blue-600' : 'bg-green-900 border-green-700'
                        }`} />
                        <div className={`h-px flex-1 ${scenario === 'fork' ? 'bg-blue-700' : 'bg-green-800'}`} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Trunk continues */}
                  <AnimatePresence>
                    {showBranch && (
                      <motion.div key="cont" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-3 pl-[7px]">
                        <div className="w-px h-6 bg-zinc-800" />
                        <div className="text-xs text-zinc-700 font-mono pl-2">continues…</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent box */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* Fork agent */}
            {scenario === 'fork' && (
              <motion.div key="fork-box" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-blue-800 bg-blue-950/20 px-3 py-2.5 flex flex-col gap-2">
                <div className="text-xs text-blue-400 font-mono">fork agent</div>

                <AnimatePresence>
                  {showInherit && (
                    <motion.div key="msgs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="space-y-1.5">
                      {MOCK_MESSAGES.map((m, i) => (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12 }}
                          className="flex items-center gap-1.5">
                          <span className="text-xs text-blue-700 font-mono shrink-0">←</span>
                          <span className={`text-xs font-mono shrink-0 ${m.role === 'user' ? 'text-zinc-500' : 'text-green-600'}`}>
                            {m.role}
                          </span>
                        </motion.div>
                      ))}
                      <div className="flex items-center gap-2 pt-1.5 border-t border-blue-900/50">
                        <span className="text-xs text-zinc-600 font-mono">cache</span>
                        <span className="text-xs text-green-400 font-mono">HIT · 0.1×</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {phase === 'fork-spawn' && (
                    <motion.div key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs text-zinc-600">inheriting…</motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {phase === 'fork-run' && (
                    <motion.div key="tools" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="pt-2 border-t border-blue-900/40 space-y-1">
                      <div className="text-xs text-zinc-500">tools</div>
                      <div className="flex flex-wrap gap-1">
                        {['Read', 'Grep', 'Write*'].map(t => (
                          <span key={t} className="text-xs font-mono border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400">{t}</span>
                        ))}
                      </div>
                      <div className="text-xs text-zinc-600">background · parent continues</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Named agent */}
            {scenario === 'named' && (
              <motion.div key="named-box" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-green-800 bg-green-950/20 px-3 py-2.5 flex flex-col gap-2">
                <div className="text-xs text-green-400 font-mono">named agent</div>

                <div className="space-y-1.5">
                  {MOCK_MESSAGES.map((_, i) => (
                    <div key={i} className="flex items-center gap-1.5 opacity-20">
                      <span className="text-xs text-zinc-700 font-mono shrink-0">—</span>
                      <div className="flex-1 h-px bg-zinc-700" />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-green-900/50">
                    <span className="text-xs text-zinc-600 font-mono">cache</span>
                    <span className="text-xs text-zinc-600 font-mono">cold · full price</span>
                  </div>
                </div>

                <AnimatePresence>
                  {phase === 'named-run' && (
                    <motion.div key="run" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="pt-2 border-t border-green-900/40 space-y-1">
                      <div className="text-xs text-zinc-500 font-mono">from AgentDefinition</div>
                      <div className="flex flex-wrap gap-1">
                        {['default', 'worktree', 'remote'].map(m => (
                          <span key={m} className="text-xs font-mono border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400">{m}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right annotation panel */}
        <div className="shrink-0" style={{ width: 210 }}>
          <AnimatePresence mode="wait">
            {scenario === 'fork' && (
              <motion.div key="fork-ann" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400">system</span>
                  <span className="text-xs text-zinc-500">initiated</span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">Called by the system, not the model. Never exposed as a <span className="font-mono text-zinc-300">subagent_type</span>.</p>
                <p className="text-xs text-zinc-500 leading-snug">Used for background tasks that need the parent's conversation history:</p>
                <ul className="space-y-0.5">
                  {['extractMemories', 'promptSuggestion', 'autoDream', 'compact summary', 'sessionMemory'].map(item => (
                    <li key={item} className="text-[11px] text-zinc-600 font-mono flex gap-1.5">
                      <span className="text-zinc-700 shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
            {scenario === 'named' && (
              <motion.div key="named-ann" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400">model</span>
                  <span className="text-xs text-zinc-500">initiated</span>
                </div>
                <p className="text-xs text-zinc-400 leading-snug">Called by the model. Includes <span className="font-mono text-zinc-300">subagent_type</span> in its AgentTool call to request a specific capability:</p>
                <ul className="space-y-0.5">
                  {[
                    { name: 'Explore',           desc: 'read-only codebase search' },
                    { name: 'Plan',              desc: 'designs implementation plans' },
                    { name: 'verification',      desc: 'runs builds/tests, PASS/FAIL' },
                    { name: 'claude-code-guide', desc: 'answers Claude Code questions' },
                  ].map(item => (
                    <li key={item.name} className="text-[11px] text-zinc-600 flex gap-1.5">
                      <span className="text-zinc-700 shrink-0">·</span>
                      <span><span className="font-mono text-zinc-500">{item.name}</span> — {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Status */}
      <div className="min-h-[36px] shrink-0">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-600 text-xs">fork branches off the parent · named starts fresh</motion.p>
          )}
          {phase === 'parent-convo' && (
            <motion.p key="pc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">parent has conversation history and a warm prompt cache</motion.p>
          )}
          {phase === 'decision' && (
            <motion.p key="dec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">AgentTool checks whether a <span className="text-zinc-300">subagent_type</span> was specified</motion.p>
          )}
          {phase === 'fork-spawn' && (
            <motion.p key="fs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">fork branches off the parent trunk — a new query loop starts here</motion.p>
          )}
          {phase === 'fork-inherit' && (
            <motion.p key="fi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">fork receives all parent messages and <span className="text-green-400">shares the prompt cache</span> — 0.1× cost</motion.p>
          )}
          {phase === 'fork-run' && (
            <motion.p key="fr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">runs in background with restricted tools — parent trunk continues independently</motion.p>
          )}
          {phase === 'named-spawn' && (
            <motion.p key="ns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">named agent branches off but <span className="text-green-400">inherits nothing</span> — empty messages, cold cache</motion.p>
          )}
          {phase === 'named-run' && (
            <motion.p key="nr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-zinc-400 text-xs">context loaded from AgentDefinition — sync or async, configured isolation</motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800 shrink-0">
        <button onClick={() => setAutoPlay(!autoPlay)} className="text-zinc-500 hover:text-white text-xs transition-colors">
          {autoPlay ? '⏸' : '▶'}
        </button>
        <div className="flex gap-3">
          <button onClick={prev}  className="text-zinc-500 hover:text-white text-xs transition-colors">← back</button>
          <button onClick={next}  className="text-zinc-500 hover:text-white text-xs transition-colors">next →</button>
          <button onClick={reset} className="text-zinc-500 hover:text-white text-xs transition-colors">↺</button>
        </div>
      </div>
      </div>

      {/* Right side - Content display */}
      <div className="w-1/2 flex flex-col border-l border-zinc-800 min-w-0">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setRightTab('when-to-fork')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              rightTab === 'when-to-fork'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            When to Fork
          </button>
          <button
            onClick={() => setRightTab('agent-types')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              rightTab === 'agent-types'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-950/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Agent Types
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {rightTab === 'agent-types' ? AGENT_TYPES_CONTENT : WHEN_TO_FORK_CONTENT}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
