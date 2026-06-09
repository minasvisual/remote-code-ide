import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TreeNode } from '../TreeNode'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { FileNode } from '../../../../domain/entities/FileNode'

let mockApi: ReturnType<typeof createMockApi>

function makeFile(name: string, path: string): FileNode {
  return { name, path, type: 'file', size: 100, modifiedAt: '', permissions: '-rw-r--r--', isLoaded: false }
}

function makeDir(name: string, path: string, children?: FileNode[]): FileNode {
  return { name, path, type: 'directory', size: 0, modifiedAt: '', permissions: 'drwxr-xr-x', isLoaded: !!children, children }
}

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

vi.mock('../../../../application/contexts/EditorContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/EditorContext')>()
  return { ...original, useEditor: vi.fn() }
})

import { useApp } from '../../../../application/contexts/AppContext'
import { useEditor } from '../../../../application/contexts/EditorContext'

const mockOpenFile = vi.fn()
const mockNotify = vi.fn()

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useApp).mockReturnValue({
    activeSession: null, connections: [], notifications: [], isConnecting: false,
    loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
    deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
    disconnect: vi.fn(), notify: mockNotify, dismissNotification: vi.fn(),
  })
  vi.mocked(useEditor).mockReturnValue({
    tabs: [], activeTabId: null, openFile: mockOpenFile,
    closeTab: vi.fn(), setActiveTab: vi.fn(), cycleTab: vi.fn(), updateContent: vi.fn(),
    saveActiveFile: vi.fn(), isSaving: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mockOpenFile.mockReset()
  mockNotify.mockReset()
})

describe('TreeNode — file', () => {
  it('renders file name', () => {
    renderWithProviders(<TreeNode node={makeFile('index.ts', '/index.ts')} sessionId="sess-1" />)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('calls openFile when file is clicked', async () => {
    const node = makeFile('app.ts', '/app.ts')
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" />)
    await userEvent.click(screen.getByText('app.ts'))
    expect(mockOpenFile).toHaveBeenCalledWith(node, 'sess-1')
  })
})

describe('TreeNode — directory', () => {
  it('renders directory name with closed arrow', () => {
    renderWithProviders(<TreeNode node={makeDir('src', '/src')} sessionId="sess-1" />)
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('▸')).toBeInTheDocument()
  })

  it('expands directory and loads children on click', async () => {
    const childFile = makeFile('main.ts', '/src/main.ts')
    mockApi.sftp.listDir.mockResolvedValue([childFile])

    renderWithProviders(<TreeNode node={makeDir('src', '/src')} sessionId="sess-1" />)
    await userEvent.click(screen.getByText('src'))

    await waitFor(() => {
      expect(mockApi.sftp.listDir).toHaveBeenCalledWith('sess-1', '/src')
      expect(screen.getByText('main.ts')).toBeInTheDocument()
    })
  })

  it('shows expand arrow after expanding', async () => {
    mockApi.sftp.listDir.mockResolvedValue([])
    renderWithProviders(<TreeNode node={makeDir('etc', '/etc')} sessionId="sess-1" />)
    await userEvent.click(screen.getByText('etc'))
    await waitFor(() => {
      expect(screen.getByText('▾')).toBeInTheDocument()
    })
  })

  it('does not re-fetch children if already loaded', async () => {
    const children = [makeFile('hosts', '/etc/hosts')]
    renderWithProviders(<TreeNode node={makeDir('etc', '/etc', children)} sessionId="sess-1" />)
    await userEvent.click(screen.getByText('etc'))
    expect(mockApi.sftp.listDir).not.toHaveBeenCalled()
    expect(screen.getByText('hosts')).toBeInTheDocument()
  })
})
