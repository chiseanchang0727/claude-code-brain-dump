import type { BoxVariant } from './types'

export const theme = {
  app: {
    bg: 'bg-zinc-950',
    footer: 'border-t border-zinc-800 text-xs text-zinc-500 text-center',
  },

  nav: {
    container: 'border-b border-zinc-800',
    crumbActive: 'text-white font-semibold text-sm',
    crumbLink: 'text-zinc-500 hover:text-zinc-300 text-sm transition-colors',
    separator: 'text-zinc-700 text-sm select-none',
  },

  box: {
    nav: {
      bg: 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600',
      border: 'border-zinc-400 shadow-md shadow-zinc-700',
      sublabel: 'text-zinc-400',
      cta: 'text-zinc-300',
    },
    bg: {
      default: 'bg-zinc-800 text-zinc-100',
      green:   'bg-green-950/60 text-green-100',
      yellow:  'bg-yellow-950/60 text-yellow-100',
      amber:   'bg-orange-950/60 text-orange-100',
      red:     'bg-red-950/60 text-red-100',
    } satisfies Record<BoxVariant, string>,
    border: {
      default: { idle: 'border-zinc-600',   hover: 'hover:border-zinc-400',   selected: 'border-zinc-300 shadow-zinc-700' },
      green:   { idle: 'border-green-800',  hover: 'hover:border-green-500',  selected: 'border-green-400 shadow-green-900' },
      yellow:  { idle: 'border-yellow-800', hover: 'hover:border-yellow-500', selected: 'border-yellow-400 shadow-yellow-900' },
      amber:   { idle: 'border-orange-800', hover: 'hover:border-orange-500', selected: 'border-orange-400 shadow-orange-900' },
      red:     { idle: 'border-red-800',    hover: 'hover:border-red-500',    selected: 'border-red-400 shadow-red-900' },
    } satisfies Record<BoxVariant, { idle: string; hover: string; selected: string }>,
    sublabel: {
      default: 'text-zinc-500',
      green:   'text-green-500',
      yellow:  'text-yellow-500',
      amber:   'text-orange-500',
      red:     'text-red-500',
    } satisfies Record<BoxVariant, string>,
  },

  arrow: {
    color: '#71717a',
  },

  panel: {
    bg: 'bg-zinc-900 border-l border-zinc-700',
    header: 'border-b border-zinc-700',
    title: 'text-zinc-100 font-bold text-base leading-snug',
    close: 'text-zinc-500 hover:text-zinc-300',
    md: {
      h2: 'text-zinc-200 font-semibold text-sm mt-5 mb-2 first:mt-0',
      h3: 'text-zinc-400 font-semibold text-xs mt-4 mb-1.5 uppercase tracking-wide',
      p:  'text-zinc-400 text-sm leading-relaxed mb-3',
      ul: 'text-zinc-400 text-sm space-y-1 mb-3 ml-4 list-disc',
      ol: 'text-zinc-400 text-sm space-y-1 mb-3 ml-4 list-decimal',
      codeBlock: 'bg-zinc-800 text-zinc-300 text-xs font-mono rounded-lg px-4 py-3 mb-3 overflow-x-auto whitespace-pre border border-zinc-700',
      codeInline: 'bg-zinc-800 text-zinc-300 text-xs font-mono rounded px-1.5 py-0.5 border border-zinc-700',
      th: 'text-left text-zinc-300 font-semibold border-b border-zinc-700 pb-1.5 pr-4',
      td: 'border-b border-zinc-800 py-1.5 pr-4 text-zinc-400',
      strong: 'text-zinc-200 font-semibold',
      blockquote: 'border-l-2 border-zinc-500 pl-4 text-zinc-500 italic mb-3',
    },
  },
}
