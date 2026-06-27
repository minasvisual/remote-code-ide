import { useEffect, useRef } from 'react'

interface Props {
  x: number
  y: number
  hasSelection: boolean
  onCopy: () => void
  onPaste: () => void
  onDismiss: () => void
}

export function TerminalContextMenu({ x, y, hasSelection, onCopy, onPaste, onDismiss }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onDismiss])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[140px] py-1 bg-ide-sidebar border border-ide-border rounded shadow-lg"
      style={{ left: x, top: y }}
    >
      <button
        className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between ${
          hasSelection
            ? 'text-ide-text hover:bg-ide-hover cursor-pointer'
            : 'text-ide-text-muted cursor-default'
        }`}
        onClick={hasSelection ? onCopy : undefined}
        disabled={!hasSelection}
      >
        <span>Copy</span>
        <span className="text-ide-text-muted text-xs ml-4">Ctrl+Shift+C</span>
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-sm text-ide-text hover:bg-ide-hover cursor-pointer flex items-center justify-between"
        onClick={onPaste}
      >
        <span>Paste</span>
        <span className="text-ide-text-muted text-xs ml-4">Ctrl+Shift+V</span>
      </button>
    </div>
  )
}
