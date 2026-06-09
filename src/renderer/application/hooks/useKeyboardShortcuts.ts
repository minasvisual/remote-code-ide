import { useEffect, useRef } from 'react'

interface Callbacks {
  closeTab(tabId: string): void
  cycleTab(delta: 1 | -1): void
  activeTabId: string | null
}

export function useKeyboardShortcuts({ closeTab, cycleTab, activeTabId }: Callbacks) {
  const closeTabRef = useRef(closeTab)
  const cycleTabRef = useRef(cycleTab)
  const activeTabIdRef = useRef(activeTabId)

  closeTabRef.current = closeTab
  cycleTabRef.current = cycleTab
  activeTabIdRef.current = activeTabId

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return

      if (e.key === 'w' || e.key === 'W') {
        const target = e.target as EventTarget
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
        const tabId = activeTabIdRef.current
        if (!tabId) return
        e.preventDefault()
        closeTabRef.current(tabId)
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        cycleTabRef.current(e.shiftKey ? -1 : 1)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
}
