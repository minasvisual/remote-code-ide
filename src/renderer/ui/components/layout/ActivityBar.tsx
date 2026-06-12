interface ActivityBarProps {
  activeView: string
  onViewChange(view: string): void
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

const topItems = [
  { id: 'explorer', icon: '📁', title: 'Explorer' },
  { id: 'connections', icon: '⚡', title: 'Connections' }
]

const bottomItems = [
  { id: 'about', icon: null, title: 'About' }
]

function BarButton({
  item,
  activeView,
  onViewChange
}: {
  item: { id: string; icon: string | null; title: string }
  activeView: string
  onViewChange: (id: string) => void
}) {
  return (
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
      {item.icon !== null ? item.icon : <InfoIcon />}
    </button>
  )
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className="w-12 bg-ide-activitybar flex flex-col items-center pt-2 border-r border-ide-border shrink-0">
      {topItems.map((item) => (
        <BarButton key={item.id} item={item} activeView={activeView} onViewChange={onViewChange} />
      ))}
      <div className="mt-auto flex flex-col items-center pb-2">
        {bottomItems.map((item) => (
          <BarButton key={item.id} item={item} activeView={activeView} onViewChange={onViewChange} />
        ))}
      </div>
    </div>
  )
}
