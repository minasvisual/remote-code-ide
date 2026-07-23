import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function baseUseAppReturn(overrides: Partial<ReturnType<typeof useApp>> = {}): ReturnType<typeof useApp> {
  return {
    activeSession: mockSession,
    connections: [],
    notifications: [],
    isConnecting: false,
    terminalTargetDir: null,
    clipboard: null,
    uploadBatches: [],
    uploadRefreshSignal: null,
    loadConnections: vi.fn(),
    saveConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    testConnection: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    notify: vi.fn(),
    dismissNotification: vi.fn(),
    updateNotification: vi.fn(),
    openTerminalAt: vi.fn(),
    registerBeforeDisconnect: vi.fn(),
    copyToClipboard: vi.fn(),
    clearClipboard: vi.fn(),
    startUpload: vi.fn(),
    dismissUpload: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useApp).mockReturnValue(baseUseAppReturn())
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

  it('calls sftp.listDir with initialDirectory when set on the session', async () => {
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({
      activeSession: { ...mockSession, initialDirectory: '/home/user/projects' },
    }))
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(mockApi.sftp.listDir).toHaveBeenCalledWith('sess-1', '/home/user/projects')
    })
  })

  it('falls back to / when initialDirectory is not set on the session', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(mockApi.sftp.listDir).toHaveBeenCalledWith('sess-1', '/')
    })
  })

  it('disconnects when listDir fails and initialDirectory is set', async () => {
    const mockDisconnect = vi.fn()
    const mockNotify = vi.fn()
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({
      activeSession: { ...mockSession, initialDirectory: '/bad/path' },
      disconnect: mockDisconnect,
      notify: mockNotify,
    }))
    mockApi.sftp.listDir.mockRejectedValue(new Error('No such file or directory'))
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', expect.stringContaining('No such file or directory'))
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  it('does not disconnect when listDir fails without initialDirectory', async () => {
    const mockDisconnect = vi.fn()
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ disconnect: mockDisconnect }))
    mockApi.sftp.listDir.mockRejectedValue(new Error('Permission denied'))
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(mockDisconnect).not.toHaveBeenCalled()
    })
  })

  it('renders Upload Files and Upload Folder buttons in toolbar', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => {
      expect(screen.getByTitle('Upload Files')).toBeInTheDocument()
      expect(screen.getByTitle('Upload Folder')).toBeInTheDocument()
    })
  })

  it('calls startUpload with the session id, root dir, and "files" when Upload Files button is clicked', async () => {
    const mockStartUpload = vi.fn()
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ startUpload: mockStartUpload }))
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => screen.getByTitle('Upload Files'))
    await userEvent.click(screen.getByTitle('Upload Files'))
    await waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledWith('sess-1', '/', 'files')
    })
  })

  it('calls startUpload with "folder" when Upload Folder button is clicked', async () => {
    const mockStartUpload = vi.fn()
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ startUpload: mockStartUpload }))
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => screen.getByTitle('Upload Folder'))
    await userEvent.click(screen.getByTitle('Upload Folder'))
    await waitFor(() => {
      expect(mockStartUpload).toHaveBeenCalledWith('sess-1', '/', 'folder')
    })
  })

  it('renders nothing when there is no active session', () => {
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ activeSession: null }))
    const { container } = renderWithProviders(<FileExplorer />)
    expect(container.firstChild).toBeNull()
  })
})

describe('FileExplorer — upload refresh signal', () => {
  it('reloads the root listing when uploadRefreshSignal targets the root dir', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ uploadRefreshSignal: null }))
    const { rerender } = renderWithProviders(<FileExplorer />)
    await waitFor(() => expect(mockApi.sftp.listDir).toHaveBeenCalledTimes(1))

    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({ uploadRefreshSignal: { path: '/', tick: 1 } }))
    rerender(<FileExplorer />)

    await waitFor(() => expect(mockApi.sftp.listDir).toHaveBeenCalledTimes(2))
  })
})

describe('FileExplorer — background context menu (root paste)', () => {
  it('does not show "Paste" on empty-space right-click with an empty clipboard, but shows "Find in Folder..."', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    const { container } = renderWithProviders(<FileExplorer />)
    await waitFor(() => expect(mockApi.sftp.listDir).toHaveBeenCalled())

    const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement
    fireEvent.contextMenu(scrollArea)

    expect(screen.queryByText('Paste')).not.toBeInTheDocument()
    expect(screen.getByText('Find in Folder...')).toBeInTheDocument()
  })

  it('clicking "Find in Folder..." opens FindInFolderModal targeting the root dir', async () => {
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({
      activeSession: { ...mockSession, initialDirectory: '/home/user/projects' },
    }))
    mockApi.sftp.listDir.mockResolvedValue([])
    const { container } = renderWithProviders(<FileExplorer />)
    await waitFor(() => expect(mockApi.sftp.listDir).toHaveBeenCalled())

    const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement
    fireEvent.contextMenu(scrollArea)
    await userEvent.click(screen.getByText('Find in Folder...'))

    expect(screen.getByText('Find in Folder')).toBeInTheDocument()
    expect(screen.getByText('/home/user/projects')).toBeInTheDocument()
  })

  it('shows "Paste" on empty-space right-click with a clipboard entry, targeting the root dir', async () => {
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({
      clipboard: { sessionId: 'sess-1', path: '/dir/other.ts', name: 'other.ts', type: 'file' },
    }))
    mockApi.sftp.listDir.mockResolvedValue([])
    const { container } = renderWithProviders(<FileExplorer />)
    await waitFor(() => expect(mockApi.sftp.listDir).toHaveBeenCalled())

    const scrollArea = container.querySelector('.overflow-y-auto') as HTMLElement
    fireEvent.contextMenu(scrollArea)
    expect(screen.getByText('Find in Folder...')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Paste'))

    await waitFor(() => {
      expect(mockApi.sftp.copy).toHaveBeenCalledWith('sess-1', '/dir/other.ts', '/other.ts', 'file', false)
    })
  })

  it('right-clicking a file row does not open the background context menu', async () => {
    vi.mocked(useApp).mockReturnValue(baseUseAppReturn({
      clipboard: { sessionId: 'sess-1', path: '/other.ts', name: 'other.ts', type: 'file' },
    }))
    mockApi.sftp.listDir.mockResolvedValue([makeFile('readme.md', '/readme.md')])
    renderWithProviders(<FileExplorer />)
    await waitFor(() => screen.getByText('readme.md'))

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('readme.md') })

    expect(screen.queryByText('Paste')).not.toBeInTheDocument()
  })
})
