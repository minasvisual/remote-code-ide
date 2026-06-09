import { useState } from 'react'
import { Button } from '../commons/Button'
import { Spinner } from '../commons/Spinner'
import { ConnectionForm } from './ConnectionForm'
import { useApp } from '../../../application/contexts/AppContext'

export function ConnectionManager() {
  const { connections, connect, deleteConnection, isConnecting } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const handleConnect = async (id: string) => {
    setConnectingId(id)
    await connect(id)
    setConnectingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted">
          Connections
        </span>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(true)} title="New connection">
          +
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
            <div className="text-4xl opacity-20">🔌</div>
            <p className="text-xs text-ide-text-muted">No connections yet.</p>
            <Button size="sm" onClick={() => setShowForm(true)}>Add Connection</Button>
          </div>
        ) : (
          <ul className="py-1">
            {connections.map((conn) => (
              <li
                key={conn.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-ide-hover group"
              >
                <span className="text-ide-accent text-sm">⚡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ide-text truncate">{conn.label}</p>
                  <p className="text-xs text-ide-text-muted truncate">
                    {conn.username}@{conn.host}:{conn.port}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteConnection(conn.id)}
                    title="Delete"
                  >
                    🗑
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConnect(conn.id)}
                    disabled={isConnecting}
                    title="Connect"
                  >
                    {connectingId === conn.id ? <Spinner size="sm" /> : 'Connect'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && <ConnectionForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
