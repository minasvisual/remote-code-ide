import { screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalPanel } from '../TerminalPanel'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

let mockTerminalInstance: any

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    loadAddon = vi.fn()
    open = vi.fn()
    onData = vi.fn()
    dispose = vi.fn()
    write = vi.fn()
    focus = vi.fn()
    paste = vi.fn()
    cols = 80
    rows = 24
    getSelection = vi.fn().mockReturnValue('')
    attachCustomKeyEventHandler = vi.fn()
    constructor() {
      mockTerminalInstance = this
    }
  },
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn()
    activate = vi.fn()
  },
}))

vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useApp } from '../../../../application/contexts/AppContext'

const mockNotify = vi.fn()

const baseAppValue = {
  connections: [], notifications: [], isConnecting: false,
  terminalTargetDir: null,
  loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
  deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
  disconnect: vi.fn(), notify: mockNotify, dismissNotification: vi.fn(),
  openTerminalAt: vi.fn(),
  registerBeforeDisconnect: vi.fn(),
}

let mockApi: ReturnType<typeof createMockApi>

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)

  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  })

  vi.stubGlobal('navigator', {
    ...navigator,
    platform: 'Win32',
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('pasted text'),
    },
  })

  vi.mocked(useApp).mockReturnValue({
    ...baseAppValue,
    activeSession: { sessionId: 'sess-1', connectionId: 'conn-1', connectionLabel: 'My Server' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mockTerminalInstance = null
})

function renderTerminal() {
  const result = renderWithProviders(<TerminalPanel />)
  return result
}

function getKeyHandler(): (e: KeyboardEvent) => boolean {
  return mockTerminalInstance.attachCustomKeyEventHandler.mock.calls[0][0]
}

describe('Terminal clipboard keyboard shortcuts', () => {
  it('registers attachCustomKeyEventHandler on mount', () => {
    renderTerminal()
    expect(mockTerminalInstance.attachCustomKeyEventHandler).toHaveBeenCalledOnce()
  })

  it('copies selection to clipboard on Ctrl+Shift+C', async () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('selected text')
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keydown', { key: 'C', ctrlKey: true, shiftKey: true }))

    expect(result).toBe(false)
    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('selected text')
    })
  })

  it('allows Ctrl+C (no Shift) to pass through as SIGINT when no selection', () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('')
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, shiftKey: false }))

    expect(result).toBe(true)
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('allows Ctrl+Shift+C to pass through when no selection', () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('')
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keydown', { key: 'C', ctrlKey: true, shiftKey: true }))

    expect(result).toBe(true)
  })

  it('pastes clipboard content on Ctrl+Shift+V', async () => {
    renderTerminal()
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keydown', { key: 'V', ctrlKey: true, shiftKey: true }))

    expect(result).toBe(false)
    await vi.waitFor(() => {
      expect(navigator.clipboard.readText).toHaveBeenCalled()
      expect(mockTerminalInstance.paste).toHaveBeenCalledWith('pasted text')
    })
  })

  it('ignores non-clipboard keydown events', () => {
    renderTerminal()
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keydown', { key: 'a', ctrlKey: false }))

    expect(result).toBe(true)
  })

  it('ignores keyup events', () => {
    renderTerminal()
    const handler = getKeyHandler()

    const result = handler(new KeyboardEvent('keyup', { key: 'C', ctrlKey: true, shiftKey: true }))

    expect(result).toBe(true)
  })
})

describe('Terminal context menu', () => {
  it('shows context menu on right-click', () => {
    renderTerminal()
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    expect(screen.getByText('Copy')).toBeInTheDocument()
    expect(screen.getByText('Paste')).toBeInTheDocument()
  })

  it('disables Copy when no selection', () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('')
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    const copyButton = screen.getByText('Copy').closest('button')!
    expect(copyButton).toBeDisabled()
  })

  it('enables Copy when there is a selection', () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('some text')
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    const copyButton = screen.getByText('Copy').closest('button')!
    expect(copyButton).not.toBeDisabled()
  })

  it('closes context menu on Escape', () => {
    renderTerminal()
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })
    expect(screen.getByText('Copy')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Copy')).not.toBeInTheDocument()
  })

  it('closes context menu on click outside', () => {
    renderTerminal()
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })
    expect(screen.getByText('Copy')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Copy')).not.toBeInTheDocument()
  })

  it('calls paste when Paste is clicked', async () => {
    renderTerminal()
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    await act(async () => {
      fireEvent.click(screen.getByText('Paste'))
    })

    await vi.waitFor(() => {
      expect(navigator.clipboard.readText).toHaveBeenCalled()
      expect(mockTerminalInstance.paste).toHaveBeenCalledWith('pasted text')
    })
  })

  it('calls copy when Copy is clicked with selection', async () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('selected text')
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    await act(async () => {
      fireEvent.click(screen.getByText('Copy'))
    })

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('selected text')
    })
  })

  it('refocuses terminal after context menu action', async () => {
    renderTerminal()
    mockTerminalInstance.getSelection.mockReturnValue('text')
    const container = screen.getByText('Opening terminal…').parentElement!

    fireEvent.contextMenu(container, { clientX: 100, clientY: 200 })

    await act(async () => {
      fireEvent.click(screen.getByText('Copy'))
    })

    await vi.waitFor(() => {
      expect(mockTerminalInstance.focus).toHaveBeenCalled()
    })
  })
})
