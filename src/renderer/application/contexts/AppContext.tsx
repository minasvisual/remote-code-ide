import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import type { Connection, NewConnection } from '../../domain/entities/Connection'
import type { ActiveSession } from '../../domain/entities/EditorTab'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface AppContextValue {
  connections: Connection[]
  activeSession: ActiveSession | null
  notifications: Notification[]
  isConnecting: boolean
  loadConnections(): Promise<void>
  saveConnection(conn: NewConnection): Promise<Connection>
  updateConnection(conn: Connection): Promise<Connection>
  deleteConnection(id: string): Promise<void>
  testConnection(conn: NewConnection): Promise<{ success: boolean; message: string }>
  connect(connectionId: string): Promise<void>
  disconnect(): Promise<void>
  notify(type: Notification['type'], message: string): void
  dismissNotification(id: string): void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  const notify = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { id, type, message }])
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const loadConnections = useCallback(async () => {
    const list = await api.connections.list()
    setConnections(list)
  }, [api])

  useEffect(() => {
    loadConnections()
    api.ssh.onDisconnected((sessionId) => {
      setActiveSession((prev) => (prev?.sessionId === sessionId ? null : prev))
      notify('info', 'SSH session disconnected')
    })
  }, [])

  const saveConnection = useCallback(
    async (conn: NewConnection): Promise<Connection> => {
      const saved = await api.connections.save(conn)
      setConnections((prev) => [...prev, saved])
      return saved
    },
    [api]
  )

  const updateConnection = useCallback(
    async (conn: Connection): Promise<Connection> => {
      const updated = await api.connections.update(conn)
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? updated : c)))
      return updated
    },
    [api]
  )

  const deleteConnection = useCallback(
    async (id: string) => {
      await api.connections.delete(id)
      setConnections((prev) => prev.filter((c) => c.id !== id))
    },
    [api]
  )

  const testConnection = useCallback(
    (conn: NewConnection) => api.connections.test(conn),
    [api]
  )

  const connect = useCallback(
    async (connectionId: string) => {
      setIsConnecting(true)
      try {
        const result = await api.ssh.connect(connectionId)
        if (!result.success) throw new Error(result.message ?? 'Connection failed')
        const connection = connections.find((c) => c.id === connectionId)!
        setActiveSession({
          sessionId: result.sessionId,
          connectionId,
          connectionLabel: connection.label,
          initialDirectory: connection.initialDirectory
        })
        notify('success', `Connected to ${connection.label}`)
      } catch (err: unknown) {
        notify('error', (err as Error).message)
      } finally {
        setIsConnecting(false)
      }
    },
    [api, connections, notify]
  )

  const disconnect = useCallback(async () => {
    if (!activeSession) return
    await api.ssh.disconnect(activeSession.sessionId)
    setActiveSession(null)
    notify('info', 'Disconnected')
  }, [api, activeSession, notify])

  return (
    <AppContext.Provider
      value={{
        connections,
        activeSession,
        notifications,
        isConnecting,
        loadConnections,
        saveConnection,
        updateConnection,
        deleteConnection,
        testConnection,
        connect,
        disconnect,
        notify,
        dismissNotification
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
