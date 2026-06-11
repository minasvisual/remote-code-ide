import { useState } from 'react'
import { AboutTab } from './AboutTab'
import { DocsTab } from './DocsTab'

type Tab = 'about' | 'docs'

export function AboutPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('about')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-ide-border shrink-0">
        {(['about', 'docs'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-ide-accent text-ide-text'
                : 'border-transparent text-ide-text-muted hover:text-ide-text'
            }`}
          >
            {tab === 'about' ? 'About' : 'Docs'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'about' ? <AboutTab /> : <DocsTab />}
      </div>
    </div>
  )
}
