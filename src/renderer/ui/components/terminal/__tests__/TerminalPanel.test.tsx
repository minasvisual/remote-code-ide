import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalPanel } from '../TerminalPanel'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

// Mock xterm and addon-fit so they don't fail in jsdom
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    loadAddon = vi.fn()
    open = vi.fn()
    onData = vi.fn()
    dispose = vi.fn()
    cols = 80
    rows = 24
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

let mockApi: ReturnType<typeof createMockApi>

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)

  // jsdom does not implement ResizeObserver
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TerminalPanel', () => {
  it('shows connect message when no active session', () => {
    vi.mocked(useApp).mockReturnValue({
      activeSession: null, connections: [], notifications: [], isConnecting: false,
      loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
      deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
      disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(),
    })
    renderWithProviders(<TerminalPanel />)
    expect(screen.getByText('Connect to a server to open a terminal')).toBeInTheDocument()
  })

  it('renders terminal container when session is active', () => {
    vi.mocked(useApp).mockReturnValue({
      activeSession: { sessionId: 'sess-1', connectionId: 'conn-1', connectionLabel: 'My Server' },
      connections: [], notifications: [], isConnecting: false,
      loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
      deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
      disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(),
    })
    renderWithProviders(<TerminalPanel />)
    expect(screen.getByText('Opening terminal…')).toBeInTheDocument()
  })

  it('calls terminal.create when session is active', async () => {
    vi.mocked(useApp).mockReturnValue({
      activeSession: { sessionId: 'sess-42', connectionId: 'conn-1', connectionLabel: 'My Server' },
      connections: [], notifications: [], isConnecting: false,
      loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
      deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
      disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(),
    })
    renderWithProviders(<TerminalPanel />)
    await vi.waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('sess-42', 80, 24)
    })
  })
})
