import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from '../App'
import { createMockApi } from './helpers/mockApi'

vi.mock('../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useApp } from '../application/contexts/AppContext'

const baseAppValue = {
  connections: [], notifications: [], isConnecting: false,
  terminalTargetDir: null, clipboard: null,
  uploadBatches: [], uploadRefreshSignal: null,
  loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
  deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
  disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(), updateNotification: vi.fn(),
  openTerminalAt: vi.fn(),
  registerBeforeDisconnect: vi.fn(),
  copyToClipboard: vi.fn(), clearClipboard: vi.fn(),
  startUpload: vi.fn(), dismissUpload: vi.fn(),
}

let mockApi: ReturnType<typeof createMockApi>

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useApp).mockReturnValue({
    ...baseAppValue,
    activeSession: { sessionId: 'sess-1', connectionId: 'conn-1', connectionLabel: 'My Server' },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Sidebar panel state preservation', () => {
  it('does not re-fetch the file explorer listing when switching to another sidebar view and back', async () => {
    render(<App />)

    await vi.waitFor(() => {
      expect(mockApi.sftp.listDir).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      fireEvent.click(screen.getByTitle('AI Chat'))
    })
    await act(async () => {
      fireEvent.click(screen.getByTitle('Explorer'))
    })

    expect(mockApi.sftp.listDir).toHaveBeenCalledTimes(1)
  })

  it('falls back to ConnectionManager when there is no active session', () => {
    vi.mocked(useApp).mockReturnValue({ ...baseAppValue, activeSession: null })
    render(<App />)
    expect(mockApi.sftp.listDir).not.toHaveBeenCalled()
  })
})
