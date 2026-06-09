import { useEffect, useRef } from 'react'
import type { Connection } from '../../../domain/entities/Connection'

const MENU_WIDTH = 140
const MENU_HEIGHT = 72

interface Props {
  x: number
  y: number
  connection: Connection
  onEdit(): void
  onDelete(): void
  onClose(): void
}

export function ConnectionContextMenu({ x, y, connection: _connection, onEdit, onDelete, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  const clampedX = Math.min(x, window.innerWidth - MENU_WIDTH - 4)
  const clampedY = Math.min(y, window.innerHeight - MENU_HEIGHT - 4)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: clampedY, left: clampedX, zIndex: 1000 }}
      className="w-36 bg-ide-sidebar border border-ide-border rounded shadow-lg py-1 text-sm text-ide-text"
    >
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-ide-hover"
        onClick={() => { onEdit(); onClose() }}
      >
        Edit
      </button>
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-ide-hover text-red-400"
        onClick={() => { onDelete(); onClose() }}
      >
        Delete
      </button>
    </div>
  )
}
