import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './application/contexts/AppContext'
import { EditorProvider } from './application/contexts/EditorContext'
import { ActivityBar } from './ui/components/layout/ActivityBar'
import { StatusBar } from './ui/components/layout/StatusBar'
import { ConnectionManager } from './ui/components/connections/ConnectionManager'
import { FileExplorer } from './ui/components/explorer/FileExplorer'
import { EditorTabBar } from './ui/components/editor/EditorTabBar'
import { MonacoWrapper } from './ui/components/editor/MonacoWrapper'
import { WelcomeScreen } from './ui/components/editor/WelcomeScreen'
import { TerminalPanel } from './ui/components/terminal/TerminalPanel'
import { NotificationList } from './ui/components/commons/Notification'
import { ExtensionsPanel } from './ui/components/extensions/ExtensionsPanel'
import { AboutPanel } from './ui/components/about/AboutPanel'
import { useEditor } from './application/contexts/EditorContext'
import { useKeyboardShortcuts } from './application/hooks/useKeyboardShortcuts'

function IDELayout() {
  const { activeSession, terminalTargetDir } = useApp()
  const { tabs, activeTabId, closeTab, cycleTab } = useEditor()

  useKeyboardShortcuts({ closeTab, cycleTab, activeTabId })
  const [sidebarView, setSidebarView] = useState<string>(
    activeSession ? 'explorer' : 'connections'
  )

  useEffect(() => {
    if (activeSession) setSidebarView('explorer')
  }, [activeSession?.sessionId])
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalDir, setTerminalDir] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!terminalTargetDir) return
    setTerminalDir(terminalTargetDir.path)
    setTerminalOpen(true)
  }, [terminalTargetDir?.tick])

  const hasActiveFile = tabs.some((t) => t.id === activeTabId)

  return (
    <div className="flex flex-col h-screen bg-ide-bg text-ide-text font-mono overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar activeView={sidebarView} onViewChange={setSidebarView} />

        {/* Sidebar */}
        <div className="w-60 bg-ide-sidebar border-r border-ide-border shrink-0 flex flex-col overflow-hidden">
          {sidebarView === 'about' ? (
            <AboutPanel />
          ) : sidebarView === 'extensions' ? (
            <ExtensionsPanel />
          ) : sidebarView === 'connections' || !activeSession ? (
            <ConnectionManager />
          ) : (
            <FileExplorer />
          )}
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ height: terminalOpen ? '65%' : '100%' }}
          >
            <EditorTabBar />
            <div className="flex-1 overflow-hidden">
              {hasActiveFile ? <MonacoWrapper /> : <WelcomeScreen />}
            </div>
          </div>

          {/* Terminal Toggle */}
          <div className="flex items-center px-3 h-7 bg-[#2d2d2d] border-t border-ide-border shrink-0">
            <button
              onClick={() => setTerminalOpen((v) => !v)}
              className="text-xs text-ide-text-muted hover:text-ide-text flex items-center gap-1"
            >
              ⌨ Terminal {terminalOpen ? '▾' : '▸'}
            </button>
          </div>

          {/* Terminal Panel */}
          {terminalOpen && (
            <div className="border-t border-ide-border" style={{ height: '35%' }}>
              <TerminalPanel key={terminalTargetDir?.tick} overrideDir={terminalDir} />
            </div>
          )}
        </div>
      </div>

      <StatusBar />
      <NotificationList />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <EditorProvider>
        <IDELayout />
      </EditorProvider>
    </AppProvider>
  )
}
