import { useLayoutEffect, useRef, useState } from 'react'

const EDGE_MARGIN = 4

export function useClampedMenuPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const left = Math.max(EDGE_MARGIN, Math.min(x, window.innerWidth - rect.width - EDGE_MARGIN))
    const top = Math.max(EDGE_MARGIN, Math.min(y, window.innerHeight - rect.height - EDGE_MARGIN))
    setPosition({ left, top })
  }, [x, y])

  return {
    ref,
    style: { position: 'fixed' as const, left: position.left, top: position.top },
  }
}
