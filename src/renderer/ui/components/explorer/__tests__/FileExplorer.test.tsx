import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileExplorer } from '../FileExplorer'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { FileNode } from '../../../../domain/entities/FileNode'
import type { ActiveSession } from '../../../../domain/entities/EditorTab'

let mockApi: ReturnType<typeof createMockApi>

const mockSession: ActiveSession = {
  sessionId: 'sess-1',
  connectionId: 'conn-1',
  connectionLabel: 'My Server',
}

function makeDir(name: string, path: string): FileNode {
  return { name, path, type: 'directory', size: 0, modifiedAt: '', permissions: 'drwxr-xr-x', isLoaded: false }
}

function makeFile(name: string, path: string): FileNode {
  return { name, path, type: 'file', size: 100, modifiedAt: '', permissions: '-rw-r--r--', isLoaded: false }
}

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return {
    ...original,
    useApp: vi.fn(),
  }
})

import { useApp } from '../../../../application/contexts/AppContext'

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useApp).mockReturnValue({
    activeSession: mockSession,
    connections: [],
    notifications: [],
    isConnecting: false,
    loadConnections: vi.fn(),
    saveConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    testConnection: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    notify: vi.fn(),
    dismissNotification: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('FileExplorer', () => {
  it('renders connection label in header', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(screen.getByText('My Server')).toBeInTheDocument()
    })
  })

  it('displays root files returned by sftp.listDir', async () => {
    mockApi.sftp.listDir.mockResolvedValue([
      makeDir('etc', '/etc'),
      makeFile('README.md', '/README.md'),
    ])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(screen.getByText('etc')).toBeInTheDocument()
      expect(screen.getByText('README.md')).toBeInTheDocument()
    })
  })

  it('calls sftp.listDir with session id and root path on mount', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(mockApi.sftp.listDir).toHaveBeenCalledWith('sess-1', '/')
    })
  })

  it('renders nothing when there is no active session', () => {
    vi.mocked(useApp).mockReturnValue({
      activeSession: null,
      connections: [],
      notifications: [],
      isConnecting: false,
      loadConnections: vi.fn(),
      saveConnection: vi.fn(),
      updateConnection: vi.fn(),
      deleteConnection: vi.fn(),
      testConnection: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      notify: vi.fn(),
      dismissNotification: vi.fn(),
    })
    const { container } = renderWithProviders(<FileExplorer />)
    expect(container.firstChild).toBeNull()
  })
})
