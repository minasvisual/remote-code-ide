import { useState } from 'react'
import { useApp } from '../../../application/contexts/AppContext'
import { Spinner } from './Spinner'

export function UploadWidget() {
  const { uploadBatches, dismissUpload } = useApp()
  const [expanded, setExpanded] = useState(false)

  if (uploadBatches.length === 0) return null

  const allEntries = uploadBatches.flatMap((b) => b.entries)
  const totalCount = allEntries.length
  const settledCount = allEntries.filter((e) => e.status === 'done' || e.status === 'error').length
  const errorCount = allEntries.filter((e) => e.status === 'error').length
  const isInProgress = allEntries.some((e) => e.status === 'pending' || e.status === 'uploading')

  const summary =
    totalCount === 0
      ? 'Preparing upload…'
      : isInProgress
        ? `Uploading ${settledCount} of ${totalCount} file${totalCount === 1 ? '' : 's'}…`
        : errorCount > 0
          ? `Upload finished with ${errorCount} error${errorCount === 1 ? '' : 's'}`
          : `Uploaded ${totalCount} file${totalCount === 1 ? '' : 's'}`

  const handleClose = () => {
    if (isInProgress) return
    uploadBatches.forEach((batch) => dismissUpload(batch.id))
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-ide-border">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm text-ide-text flex-1 min-w-0 text-left"
        >
          {isInProgress && <Spinner size="sm" />}
          <span className="truncate">{summary}</span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-ide-text-muted hover:text-ide-text text-xs"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▾' : '▴'}
          </button>
          <button
            onClick={handleClose}
            disabled={isInProgress}
            className="text-ide-text-muted hover:text-ide-text text-sm leading-none disabled:opacity-40 disabled:cursor-not-allowed"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="max-h-72 overflow-y-auto">
          {uploadBatches.map((batch) => (
            <div key={batch.id} className="border-b border-ide-border last:border-b-0">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ide-text-muted truncate">
                {batch.targetDir}
              </div>
              <ul className="flex flex-col gap-1 px-3 pb-2">
                {batch.entries.map((entry) => (
                  <li key={entry.remoteName} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 w-4 shrink-0">
                      {entry.status === 'pending' && <span className="text-ide-text-muted">·</span>}
                      {entry.status === 'uploading' && <Spinner size="sm" />}
                      {entry.status === 'done' && <span className="text-green-400">✓</span>}
                      {entry.status === 'error' && <span className="text-red-400">✗</span>}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={
                        entry.status === 'pending' ? 'text-ide-text-muted' :
                        entry.status === 'uploading' ? 'text-ide-text' :
                        entry.status === 'done' ? 'text-ide-text' :
                        'text-red-400'
                      }>
                        {entry.remoteName}
                      </span>
                      {entry.status === 'error' && entry.error && (
                        <span className="block text-xs text-red-400 mt-0.5">{entry.error}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
