import { useState } from 'react'

export function useDetail() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const open = (id: string) => setSelectedId(id)
  const close = () => setSelectedId(null)

  return { selectedId, open, close, isOpen: selectedId !== null }
}
