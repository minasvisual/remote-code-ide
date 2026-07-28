import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import { Button } from '../commons/Button'

interface Props {
  path: string
  original: string
  proposed: string
  onAccept(): void
  onReject(): void
}

export function DiffReviewModal({ path, original, proposed, onAccept, onReject }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      readOnly: true,
      renderSideBySide: true,
      automaticLayout: true
    })
    const originalModel = monaco.editor.createModel(original)
    const modifiedModel = monaco.editor.createModel(proposed)
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    return () => {
      diffEditor.dispose()
      originalModel.dispose()
      modifiedModel.dispose()
    }
  }, [original, proposed])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-[90vw] h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <span className="text-sm font-semibold text-ide-text truncate">Proposed edit — {path}</span>
        </div>
        <div ref={containerRef} className="flex-1" />
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-ide-border">
          <Button variant="ghost" onClick={onReject}>Reject</Button>
          <Button onClick={onAccept}>Accept</Button>
        </div>
      </div>
    </div>
  )
}
