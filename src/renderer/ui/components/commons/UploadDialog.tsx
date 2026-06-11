import { Spinner } from './Spinner'
import { Button } from './Button'

export interface UploadEntry {
  remoteName: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Props {
  entries: UploadEntry[]
  onClose: () => void
}

export function UploadDialog({ entries, onClose }: Props) {
  const isInProgress = entries.some(e => e.status === 'pending' || e.status === 'uploading')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <span className="text-sm font-semibold text-ide-text">Upload Files</span>
          <button
            onClick={isInProgress ? undefined : onClose}
            disabled={isInProgress}
            className="text-ide-text-muted hover:text-ide-text text-lg leading-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <div className="p-4 max-h-72 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-ide-text-muted">
              <Spinner size="sm" />
              <span>Preparing upload…</span>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {entries.map((entry) => (
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
          )}
        </div>

        <div className="flex justify-end px-4 py-3 border-t border-ide-border">
          <Button variant="primary" onClick={onClose} disabled={isInProgress}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
