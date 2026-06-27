import { useCallback, useRef, useState } from 'react'

interface Props {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
}

export function ResizeHandle({ direction, onResize }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const lastPos = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY
      setIsDragging(true)

      const handleMouseMove = (ev: MouseEvent) => {
        const current = direction === 'horizontal' ? ev.clientX : ev.clientY
        const delta = current - lastPos.current
        lastPos.current = current
        onResize(delta)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [direction, onResize]
  )

  const isHorizontal = direction === 'horizontal'

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-50" style={{ cursor: isHorizontal ? 'col-resize' : 'row-resize' }} />
      )}
      <div
        onMouseDown={handleMouseDown}
        className={`shrink-0 bg-ide-border hover:bg-ide-accent transition-colors ${
          isHorizontal
            ? 'w-[3px] cursor-col-resize h-full'
            : 'h-[3px] cursor-row-resize w-full'
        } ${isDragging ? 'bg-ide-accent' : ''}`}
      />
    </>
  )
}
