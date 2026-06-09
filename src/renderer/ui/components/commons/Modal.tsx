import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <span className="text-sm font-semibold text-ide-text">{title}</span>
          <button onClick={onClose} className="text-ide-text-muted hover:text-ide-text text-lg leading-none">✕</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-4 py-3 border-t border-ide-border">{footer}</div>}
      </div>
    </div>
  )
}
