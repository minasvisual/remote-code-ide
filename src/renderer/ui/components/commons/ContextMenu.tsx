import { useEffect, useRef } from 'react'

export type ContextMenuItem =
  | { type?: 'item'; label: string; onClick: () => void }
  | { type: 'divider' }

interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
  header?: string
}

export function ContextMenu({ items, position, onClose, header }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-ide-sidebar border border-ide-border rounded shadow-lg py-1 min-w-[140px]"
      style={{ left: position.x, top: position.y }}
    >
      {header && (
        <>
          <div className="px-3 py-1 text-xs font-semibold text-ide-text-muted truncate max-w-[200px]">
            {header}
          </div>
          <div className="border-t border-ide-border my-1" />
        </>
      )}
      {items.map((item, i) =>
        item.type === 'divider' ? (
          <div key={i} className="border-t border-ide-border my-1" />
        ) : (
          <button
            key={item.label}
            className="w-full text-left px-3 py-1 text-sm text-ide-text hover:bg-ide-hover"
            onClick={() => { item.onClick(); onClose() }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
