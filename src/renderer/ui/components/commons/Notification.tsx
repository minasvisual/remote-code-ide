import { useApp } from '../../../application/contexts/AppContext'
import { Spinner } from './Spinner'

export function NotificationList() {
  const { notifications, dismissNotification } = useApp()
  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => {
        const isDownloading = n.status === 'downloading'
        return (
          <div
            key={n.id}
            onClick={isDownloading ? undefined : () => dismissNotification(n.id)}
            className={`pointer-events-auto flex flex-col gap-1.5 px-3 py-2 rounded shadow-lg text-sm text-white transition-opacity ${
              isDownloading ? '' : 'cursor-pointer'
            } ${
              n.type === 'success' ? 'bg-green-700' :
              n.type === 'error'   ? 'bg-red-700' :
                                     'bg-ide-accent'
            }`}
          >
            <div className="flex items-center gap-2">
              {isDownloading && n.progress === undefined && <Spinner size="sm" />}
              <span className="flex-1">{n.message}</span>
              {n.onCancel ? (
                <button
                  onClick={(e) => { e.stopPropagation(); n.onCancel?.() }}
                  className="text-xs opacity-80 hover:opacity-100 underline"
                >
                  Cancel
                </button>
              ) : (
                <span className="text-xs opacity-70">✕</span>
              )}
            </div>
            {n.progress !== undefined && (
              <div className="h-1 w-full bg-white/20 rounded overflow-hidden">
                <div
                  className="h-full bg-white/80"
                  style={{ width: `${Math.max(0, Math.min(100, n.progress))}%` }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
