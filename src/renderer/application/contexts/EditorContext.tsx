import {
  createContext, useContext, useState, useCallback, useRef, type ReactNode
} from 'react'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import type { EditorTab } from '../../domain/entities/EditorTab'
import type { FileNode } from '../../domain/entities/FileNode'
import { v4 as uuidv4 } from 'uuid'
import { useApp } from './AppContext'

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

interface EditorContextValue {
  tabs: EditorTab[]
  activeTabId: string | null
  openFile(node: FileNode, sessionId: string): Promise<void>
  closeTab(tabId: string): void
  setActiveTab(tabId: string): void
  updateContent(tabId: string, content: string): void
  saveActiveFile(): Promise<void>
  isSaving: boolean
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const { notify, activeSession } = useApp()
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
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
        const result = await api.sftp.readFile(sessionId, node.path)
        contentRef.current.set(loadingTab.id, result.content)
        setTabs((prev) =>
          prev.map((t) =>
            t.id === loadingTab.id
              ? { ...t, content: result.content, localTempPath: result.localTempPath, isLoading: false }
              : t
          )
        )
      } catch (err: unknown) {
        setTabs((prev) => prev.filter((t) => t.id !== loadingTab.id))
        notify('error', `Failed to open file: ${(err as Error).message}`)
      }
    },
    [api, tabs, notify]
  )

  const closeTab = useCallback((tabId: string) => {
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

  return (
    <EditorContext.Provider
      value={{ tabs, activeTabId, openFile, closeTab, setActiveTab: setActiveTabId, updateContent, saveActiveFile, isSaving }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
