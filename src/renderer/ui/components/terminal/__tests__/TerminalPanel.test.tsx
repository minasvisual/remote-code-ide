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
    getSelection = vi.fn().mockReturnValue('')
    attachCustomKeyEventHandler = vi.fn()
    focus = vi.fn()
    paste = vi.fn()
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

const baseAppValue = {
  connections: [], notifications: [], isConnecting: false,
  terminalTargetDir: null,
  loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
  deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
  disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(),
  openTerminalAt: vi.fn(),
  registerBeforeDisconnect: vi.fn(),
}

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
      ...baseAppValue,
      activeSession: null,
    })
    renderWithProviders(<TerminalPanel />)
    expect(screen.getByText('Connect to a server to open a terminal')).toBeInTheDocument()
  })

  it('renders terminal container when session is active', () => {
    vi.mocked(useApp).mockReturnValue({
      ...baseAppValue,
      activeSession: { sessionId: 'sess-1', connectionId: 'conn-1', connectionLabel: 'My Server' },
    })
    renderWithProviders(<TerminalPanel />)
    expect(screen.getByText('Opening terminal…')).toBeInTheDocument()
  })

  it('calls terminal.create with undefined initialDir when session has no initialDirectory', async () => {
    vi.mocked(useApp).mockReturnValue({
      ...baseAppValue,
      activeSession: { sessionId: 'sess-42', connectionId: 'conn-1', connectionLabel: 'My Server' },
    })
    renderWithProviders(<TerminalPanel />)
    await vi.waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('sess-42', 80, 24, undefined)
    })
  })

  it('passes initialDirectory from activeSession to terminal.create', async () => {
    vi.mocked(useApp).mockReturnValue({
      ...baseAppValue,
      activeSession: {
        sessionId: 'sess-99', connectionId: 'conn-1', connectionLabel: 'My Server',
        initialDirectory: '/var/www',
      },
    })
    renderWithProviders(<TerminalPanel />)
    await vi.waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('sess-99', 80, 24, '/var/www')
    })
  })

  it('uses overrideDir prop over activeSession.initialDirectory', async () => {
    vi.mocked(useApp).mockReturnValue({
      ...baseAppValue,
      activeSession: {
        sessionId: 'sess-99', connectionId: 'conn-1', connectionLabel: 'My Server',
        initialDirectory: '/var/www',
      },
    })
    renderWithProviders(<TerminalPanel overrideDir="/opt/app" />)
    await vi.waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('sess-99', 80, 24, '/opt/app')
    })
  })
})
