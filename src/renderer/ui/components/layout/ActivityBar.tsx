interface ActivityBarProps {
  activeView: string
  onViewChange(view: string): void
}

const ITEMS = [
  { id: 'explorer', icon: '📁', title: 'Explorer' },
  { id: 'connections', icon: '⚡', title: 'Connections' },
  { id: 'extensions', icon: '🧩', title: 'Extensions (OpenVSX)' }
]

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className="w-12 bg-ide-activitybar flex flex-col items-center pt-2 border-r border-ide-border shrink-0">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          title={item.title}
          className={`w-10 h-10 flex items-center justify-center rounded text-lg mb-1 transition-colors ${
            activeView === item.id
              ? 'text-ide-text bg-ide-hover border-l-2 border-ide-accent'
              : 'text-ide-text-muted hover:text-ide-text'
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
