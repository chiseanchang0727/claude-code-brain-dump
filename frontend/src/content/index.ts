const modules = import.meta.glob('./**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export function getContent(key: string): string | null {
  return modules[`./${key}.md`] ?? null
}

export function parseContent(markdown: string): { title: string; body: string } {
  const lines = markdown.split('\n')
  const titleIdx = lines.findIndex(l => l.startsWith('# '))
  const title = titleIdx >= 0 ? lines[titleIdx].replace(/^# /, '').trim() : ''
  const body = lines
    .filter((_, i) => i !== titleIdx)
    .join('\n')
    .trimStart()
  return { title, body }
}
