import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'

function ctrlKey(key: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey, bubbles: true })
}

describe('useKeyboardShortcuts', () => {
  let closeTab: ReturnType<typeof vi.fn>
  let cycleTab: ReturnType<typeof vi.fn>

  beforeEach(() => {
    closeTab = vi.fn()
    cycleTab = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls closeTab with activeTabId on Ctrl+W', () => {
    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' }))
    document.dispatchEvent(ctrlKey('w'))
    expect(closeTab).toHaveBeenCalledWith('tab-1')
  })

  it('does not call closeTab when no active tab', () => {
    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: null }))
    document.dispatchEvent(ctrlKey('w'))
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('does not call closeTab when focus is in an input', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' }))
    input.dispatchEvent(ctrlKey('w'))
    expect(closeTab).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('does not call closeTab when focus is in a textarea', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()

    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' }))
    ta.dispatchEvent(ctrlKey('w'))
    expect(closeTab).not.toHaveBeenCalled()

    document.body.removeChild(ta)
  })

  it('calls cycleTab(1) on Ctrl+Tab', () => {
    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' }))
    document.dispatchEvent(ctrlKey('Tab'))
    expect(cycleTab).toHaveBeenCalledWith(1)
  })

  it('calls cycleTab(-1) on Ctrl+Shift+Tab', () => {
    renderHook(() => useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' }))
    document.dispatchEvent(ctrlKey('Tab', true))
    expect(cycleTab).toHaveBeenCalledWith(-1)
  })

  it('removes event listener on unmount', () => {
    const spy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ closeTab, cycleTab, activeTabId: 'tab-1' })
    )
    unmount()
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})
