import {
  createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode
} from 'react'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import type { EditorTab } from '../../domain/entities/EditorTab'
import type { FileNode } from '../../domain/entities/FileNode'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from './AppContext'
import { UnsavedChangesDialog } from '../../ui/components/commons/UnsavedChangesDialog'

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', php: 'php', rb: 'ruby', go: 'go', rs: 'rust',
  java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c', h: 'cpp',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml', xml: 'xml',
  md: 'markdown', sh: 'shell', bash: 'shell', sql: 'sql',
  dockerfile: 'dockerfile', toml: 'ini', env: 'plaintext'
}

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_MAP[ext] ?? 'plaintext'
}

interface PendingClose {
  tabId: string
  resolve: (action: 'save' | 'discard' | 'cancel') => void
}

interface EditorContextValue {
  tabs: EditorTab[]
  activeTabId: string | null
  pendingClose: PendingClose | null
  openFile(node: FileNode, sessionId: string): Promise<void>
  closeTab(tabId: string): Promise<'save' | 'discard' | 'cancel' | 'closed'>
  confirmClose(action: 'save' | 'discard' | 'cancel'): void
  setActiveTab(tabId: string): void
  cycleTab(delta: 1 | -1): void
  updateContent(tabId: string, content: string): void
  saveActiveFile(): Promise<void>
  getDirtyTabsBySession(sessionId: string): EditorTab[]
  isSaving: boolean
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const { notify, activeSession, registerBeforeDisconnect } = useApp()
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingClose, setPendingClose] = useState<PendingClose | null>(null)
  const contentRef = useRef<Map<string, string>>(new Map())

  const openFile = useCallback(
    async (node: FileNode, sessionId: string) => {
      const existing = tabs.find((t) => t.remotePath === node.path && t.sessionId === sessionId)
      if (existing) { setActiveTabId(existing.id); return }

      const loadingTab: EditorTab = {
        id: uuidv4(),
        sessionId,
        remotePath: node.path,
        localTempPath: '',
        filename: node.name,
        language: detectLanguage(node.name),
        content: '',
        isDirty: false,
        isLoading: true,
        isSaving: false
      }

      setTabs((prev) => [...prev, loadingTab])
      setActiveTabId(loadingTab.id)

      try {
        console.log(`[EditorContext] openFile → calling sftp:readFile session=${sessionId.slice(0, 8)} path=${node.path}`)
        const result = await api.sftp.readFile(sessionId, node.path)
        console.log(`[EditorContext] openFile → sftp:readFile resolved, content length=${result.content.length}`)
        contentRef.current.set(loadingTab.id, result.content)
        setTabs((prev) =>
          prev.map((t) =>
            t.id === loadingTab.id
              ? { ...t, content: result.content, localTempPath: result.localTempPath, isLoading: false }
              : t
          )
        )
      } catch (err: unknown) {
        console.error(`[EditorContext] openFile → sftp:readFile rejected:`, err)
        setTabs((prev) => prev.filter((t) => t.id !== loadingTab.id))
        notify('error', `Failed to open file: ${(err as Error).message}`)
      }
    },
    [api, tabs, notify]
  )

  const cycleTab = useCallback((delta: 1 | -1) => {
    if (tabs.length < 2) return
    const idx = tabs.findIndex((t) => t.id === activeTabId)
    if (idx === -1) return
    const nextIdx = (idx + delta + tabs.length) % tabs.length
    setActiveTabId(tabs[nextIdx].id)
  }, [tabs, activeTabId])

  const removeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId)
      const remaining = prev.filter((t) => t.id !== tabId)
      if (activeTabId === tabId) {
        const next = remaining[idx] ?? remaining[idx - 1] ?? null
        setActiveTabId(next?.id ?? null)
      }
      contentRef.current.delete(tabId)
      return remaining
    })
  }, [activeTabId])

  const closeTab = useCallback(async (tabId: string): Promise<'save' | 'discard' | 'cancel' | 'closed'> => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return 'closed'

    if (!tab.isDirty) {
      removeTab(tabId)
      return 'closed'
    }

    const action = await new Promise<'save' | 'discard' | 'cancel'>((resolve) => {
      setPendingClose({ tabId, resolve })
    })

    return action
  }, [tabs, removeTab])

  const confirmClose = useCallback((action: 'save' | 'discard' | 'cancel') => {
    if (!pendingClose) return
    const { tabId, resolve } = pendingClose

    if (action === 'cancel') {
      setPendingClose(null)
      resolve('cancel')
      return
    }

    if (action === 'discard') {
      removeTab(tabId)
      setPendingClose(null)
      resolve('discard')
      return
    }

    if (action === 'save') {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) {
        setPendingClose(null)
        resolve('cancel')
        return
      }

      setIsSaving(true)
      const content = contentRef.current.get(tabId) ?? tab.content
      api.sftp.writeFile(tab.sessionId, tab.remotePath, content)
        .then(() => {
          removeTab(tabId)
          setPendingClose(null)
          resolve('save')
        })
        .catch((err: unknown) => {
          notify('error', `Save failed: ${(err as Error).message}`)
          setPendingClose(null)
          resolve('cancel')
        })
        .finally(() => setIsSaving(false))
    }
  }, [pendingClose, tabs, api, removeTab, notify])

  const updateContent = useCallback((tabId: string, content: string) => {
    contentRef.current.set(tabId, content)
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, isDirty: true } : t))
    )
  }, [])

  const saveActiveFile = useCallback(async () => {
    if (!activeTabId || !activeSession) return
    const tab = tabs.find((t) => t.id === activeTabId)
    if (!tab || !tab.isDirty) return

    setIsSaving(true)
    try {
      const content = contentRef.current.get(activeTabId) ?? tab.content
      await api.sftp.writeFile(tab.sessionId, tab.remotePath, content)
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t))
      )
      notify('success', `Saved ${tab.filename}`)
    } catch (err: unknown) {
      notify('error', `Save failed: ${(err as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }, [api, activeTabId, tabs, activeSession, notify])

  const getDirtyTabsBySession = useCallback((sessionId: string): EditorTab[] => {
    return tabs.filter((t) => t.sessionId === sessionId && t.isDirty)
  }, [tabs])

  const closeTabRef = useRef(closeTab)
  closeTabRef.current = closeTab
  const getDirtyTabsRef = useRef(getDirtyTabsBySession)
  getDirtyTabsRef.current = getDirtyTabsBySession

  useEffect(() => {
    registerBeforeDisconnect(async (sessionId: string) => {
      const dirtyTabs = getDirtyTabsRef.current(sessionId)
      for (const tab of dirtyTabs) {
        const result = await closeTabRef.current(tab.id)
        if (result === 'cancel') return false
      }
      return true
    })
  }, [registerBeforeDisconnect])

  const pendingTab = pendingClose ? tabs.find((t) => t.id === pendingClose.tabId) : null

  return (
    <EditorContext.Provider
      value={{ tabs, activeTabId, pendingClose, openFile, closeTab, confirmClose, setActiveTab: setActiveTabId, cycleTab, updateContent, saveActiveFile, getDirtyTabsBySession, isSaving }}
    >
      {children}
      {pendingTab && (
        <UnsavedChangesDialog
          filename={pendingTab.filename}
          onSave={() => confirmClose('save')}
          onDiscard={() => confirmClose('discard')}
          onCancel={() => confirmClose('cancel')}
        />
      )}
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
