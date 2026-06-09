import { useEditor } from '../../../application/contexts/EditorContext'

export function EditorTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditor()
  if (tabs.length === 0) return null

  return (
    <div className="flex overflow-x-auto bg-[#2d2d2d] border-b border-ide-border shrink-0" style={{ scrollbarWidth: 'none' }}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer shrink-0 border-r border-ide-border text-sm transition-colors ${
            tab.id === activeTabId
              ? 'bg-ide-tab-active text-ide-text border-t-2 border-t-ide-accent'
              : 'bg-ide-tab text-ide-text-muted hover:text-ide-text'
          }`}
        >
          <span className="truncate max-w-[120px]">{tab.filename}</span>
          {tab.isDirty && <span className="text-ide-accent text-xs">●</span>}
          {tab.isLoading && <span className="text-xs opacity-50">…</span>}
          <button
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
            className="ml-1 opacity-0 group-hover:opacity-100 hover:opacity-100 text-ide-text-muted hover:text-ide-text"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
