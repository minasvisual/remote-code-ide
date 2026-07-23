import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import type { Connection, NewConnection } from '../../domain/entities/Connection'
import type { ActiveSession } from '../../domain/entities/EditorTab'
import type { UploadProgressEvent } from '../../domain/ports/IRemoteApi'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  /** 0-100. Undefined while `status: 'downloading'` renders an indeterminate spinner instead of a bar. */
  progress?: number
  status?: 'downloading' | 'done' | 'error' | 'cancelled'
  onCancel?: () => void
}

interface TerminalTarget {
  path: string
  tick: number
}

export interface ClipboardEntry {
  sessionId: string
  path: string
  name: string
  type: 'file' | 'directory'
}

export interface UploadEntry {
  remoteName: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export interface UploadBatch {
  id: string
  targetDir: string
  entries: UploadEntry[]
}

interface UploadRefreshSignal {
  path: string
  tick: number
}

interface AppContextValue {
  connections: Connection[]
  activeSession: ActiveSession | null
  notifications: Notification[]
  isConnecting: boolean
  terminalTargetDir: TerminalTarget | null
  clipboard: ClipboardEntry | null
  uploadBatches: UploadBatch[]
  uploadRefreshSignal: UploadRefreshSignal | null
  loadConnections(): Promise<void>
  saveConnection(conn: NewConnection): Promise<Connection>
  updateConnection(conn: Connection): Promise<Connection>
  deleteConnection(id: string): Promise<void>
  testConnection(conn: NewConnection): Promise<{ success: boolean; message: string }>
  connect(connectionId: string): Promise<void>
  disconnect(): Promise<void>
  notify(type: Notification['type'], message: string): string
  dismissNotification(id: string): void
  updateNotification(id: string, patch: Partial<Omit<Notification, 'id'>>): void
  openTerminalAt(path: string): void
  registerBeforeDisconnect(cb: (sessionId: string) => Promise<boolean>): void
  copyToClipboard(entry: ClipboardEntry): void
  clearClipboard(): void
  startUpload(sessionId: string, targetDir: string, mode: 'files' | 'folder'): Promise<void>
  dismissUpload(batchId: string): void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [terminalTargetDir, setTerminalTargetDir] = useState<TerminalTarget | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null)
  const [uploadBatches, setUploadBatches] = useState<UploadBatch[]>([])
  const [uploadRefreshSignal, setUploadRefreshSignal] = useState<UploadRefreshSignal | null>(null)
  const beforeDisconnectRef = useRef<((sessionId: string) => Promise<boolean>) | null>(null)
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const uploadBatchPathsRef = useRef<Map<string, string[]>>(new Map())
  const uploadProgressUnsubscribeRef = useRef<(() => void) | null>(null)
  const uploadSignaledCompleteRef = useRef<Set<string>>(new Set())

  const dismissNotification = useCallback((id: string) => {
    const timer = dismissTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.current.delete(id)
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const scheduleAutoDismiss = useCallback((id: string) => {
    const existing = dismissTimers.current.get(id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      dismissTimers.current.delete(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 4000)
    dismissTimers.current.set(id, timer)
  }, [])

  const notify = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { id, type, message }])
    scheduleAutoDismiss(id)
    return id
  }, [scheduleAutoDismiss])

  const updateNotification = useCallback(
    (id: string, patch: Partial<Omit<Notification, 'id'>>) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
      if (patch.status === 'downloading') {
        const existing = dismissTimers.current.get(id)
        if (existing) {
          clearTimeout(existing)
          dismissTimers.current.delete(id)
        }
      } else {
        scheduleAutoDismiss(id)
      }
    },
    [scheduleAutoDismiss]
  )

  const loadConnections = useCallback(async () => {
    const list = await api.connections.list()
    setConnections(list)
  }, [api])

  useEffect(() => {
    loadConnections()
    api.ssh.onDisconnected((sessionId) => {
      setActiveSession((prev) => (prev?.sessionId === sessionId ? null : prev))
      setClipboard((prev) => (prev?.sessionId === sessionId ? null : prev))
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

  const registerBeforeDisconnect = useCallback((cb: (sessionId: string) => Promise<boolean>) => {
    beforeDisconnectRef.current = cb
  }, [])

  const disconnect = useCallback(async () => {
    if (!activeSession) return
    if (beforeDisconnectRef.current) {
      const proceed = await beforeDisconnectRef.current(activeSession.sessionId)
      if (!proceed) return
    }
    await api.ssh.disconnect(activeSession.sessionId)
    setActiveSession(null)
    setTerminalTargetDir(null)
    setClipboard(null)
    notify('info', 'Disconnected')
  }, [api, activeSession, notify])

  const openTerminalAt = useCallback((path: string) => {
    setTerminalTargetDir((prev) => ({ path, tick: (prev?.tick ?? 0) + 1 }))
  }, [])

  const copyToClipboard = useCallback((entry: ClipboardEntry) => {
    setClipboard(entry)
  }, [])

  const clearClipboard = useCallback(() => {
    setClipboard(null)
  }, [])

  const matchLocalPathToBatch = useCallback((localPath: string): string | undefined => {
    for (const [batchId, paths] of uploadBatchPathsRef.current) {
      for (const p of paths) {
        if (localPath === p || localPath.startsWith(p + '/') || localPath.startsWith(p + '\\')) {
          return batchId
        }
      }
    }
    return undefined
  }, [])

  const ensureUploadProgressSubscription = useCallback(() => {
    if (uploadProgressUnsubscribeRef.current) return
    uploadProgressUnsubscribeRef.current = api.sftp.onUploadProgress((event: UploadProgressEvent) => {
      const batchId = matchLocalPathToBatch(event.localPath)
      if (!batchId) return
      setUploadBatches((prev) => prev.map((batch) => {
        if (batch.id !== batchId) return batch
        const idx = batch.entries.findIndex((e) => e.remoteName === event.remoteName)
        const entry: UploadEntry = { remoteName: event.remoteName, status: event.status, error: event.error }
        const entries = idx >= 0
          ? batch.entries.map((e, i) => (i === idx ? entry : e))
          : [...batch.entries, entry]
        return { ...batch, entries }
      }))
    })
  }, [api, matchLocalPathToBatch])

  useEffect(() => {
    return () => { uploadProgressUnsubscribeRef.current?.() }
  }, [])

  useEffect(() => {
    for (const batch of uploadBatches) {
      if (uploadSignaledCompleteRef.current.has(batch.id)) continue
      if (batch.entries.length === 0) continue
      const allSettled = batch.entries.every((e) => e.status === 'done' || e.status === 'error')
      if (!allSettled) continue
      uploadSignaledCompleteRef.current.add(batch.id)
      setUploadRefreshSignal({ path: batch.targetDir, tick: Date.now() })
    }
  }, [uploadBatches])

  const startUpload = useCallback(async (sessionId: string, targetDir: string, mode: 'files' | 'folder') => {
    const paths = await api.sftp.openUploadDialog(mode)
    if (!paths || paths.length === 0) return

    ensureUploadProgressSubscription()

    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    uploadBatchPathsRef.current.set(batchId, paths)
    setUploadBatches((prev) => [...prev, { id: batchId, targetDir, entries: [] }])

    api.sftp.uploadFiles(sessionId, targetDir, paths).catch((err: Error) => {
      notify('error', `Upload failed: ${err.message}`)
    })
  }, [api, notify, ensureUploadProgressSubscription])

  const dismissUpload = useCallback((batchId: string) => {
    setUploadBatches((prev) => {
      const batch = prev.find((b) => b.id === batchId)
      if (!batch) return prev
      const isInProgress = batch.entries.some((e) => e.status === 'pending' || e.status === 'uploading')
      if (isInProgress) return prev
      uploadBatchPathsRef.current.delete(batchId)
      uploadSignaledCompleteRef.current.delete(batchId)
      return prev.filter((b) => b.id !== batchId)
    })
  }, [])

  return (
    <AppContext.Provider
      value={{
        connections,
        activeSession,
        notifications,
        isConnecting,
        terminalTargetDir,
        clipboard,
        uploadBatches,
        uploadRefreshSignal,
        loadConnections,
        saveConnection,
        updateConnection,
        deleteConnection,
        testConnection,
        connect,
        disconnect,
        notify,
        dismissNotification,
        updateNotification,
        openTerminalAt,
        registerBeforeDisconnect,
        copyToClipboard,
        clearClipboard,
        startUpload,
        dismissUpload
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
