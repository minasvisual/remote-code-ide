import { useApp } from '../../../application/contexts/AppContext'
import { useEditor } from '../../../application/contexts/EditorContext'

export function StatusBar() {
  const { activeSession, disconnect } = useApp()
  const { tabs, activeTabId, isSaving } = useEditor()
  const tab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="flex items-center justify-between px-3 h-6 bg-ide-statusbar text-white text-xs shrink-0 select-none">
      <div className="flex items-center gap-3">
        {activeSession ? (
          <button
            onClick={disconnect}
            className="hover:bg-white/10 px-1 rounded transition-colors"
            title="Click to disconnect"
          >
            ⚡ {activeSession.connectionLabel}
          </button>
        ) : (
          <span className="opacity-70">Not connected</span>
        )}
        {isSaving && <span className="opacity-80">Saving…</span>}
      </div>

      {tab && (
        <div className="flex items-center gap-3 opacity-80">
          <span>{tab.language}</span>
          <span>{tab.isDirty ? '●' : ''}</span>
          <span>{tab.remotePath}</span>
        </div>
      )}
    </div>
  )
}
