import { useApp } from '../../../application/contexts/AppContext'

export function NotificationList() {
  const { notifications, dismissNotification } = useApp()
  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-8 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => dismissNotification(n.id)}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded shadow-lg text-sm text-white cursor-pointer transition-opacity ${
            n.type === 'success' ? 'bg-green-700' :
            n.type === 'error'   ? 'bg-red-700' :
                                   'bg-ide-accent'
          }`}
        >
          <span className="flex-1">{n.message}</span>
          <span className="text-xs opacity-70">✕</span>
        </div>
      ))}
    </div>
  )
}
