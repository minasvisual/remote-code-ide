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

describe('TreeNode — delete file', () => {
  it('right-click → context menu → confirm → api.sftp.delete called, onDelete called', async () => {
    const node = makeFile('readme.md', '/readme.md')
    const onDelete = vi.fn()
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" onDelete={onDelete} />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('readme.md') })
    expect(screen.getByText('Delete')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Delete'))

    expect(screen.getByText(/Delete "readme\.md"/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockApi.sftp.delete).toHaveBeenCalledWith('sess-1', '/readme.md')
      expect(onDelete).toHaveBeenCalledWith(node)
    })
  })
})

describe('TreeNode — delete folder', () => {
  it('right-click → confirm dialog shows recursive warning → deleteRecursive called, onDelete called', async () => {
    const node = makeDir('src', '/src')
    const onDelete = vi.fn()
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" onDelete={onDelete} />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('src') })
    await userEvent.click(screen.getByText('Delete'))

    expect(screen.getByText(/ALL its contents/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(mockApi.sftp.deleteRecursive).toHaveBeenCalledWith('sess-1', '/src')
      expect(onDelete).toHaveBeenCalledWith(node)
    })
  })
})

describe('TreeNode — delete cancel', () => {
  it('right-click → cancel → no SFTP call', async () => {
    const node = makeFile('app.ts', '/app.ts')
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('app.ts') })
    await userEvent.click(screen.getByText('Delete'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockApi.sftp.delete).not.toHaveBeenCalled()
    expect(mockApi.sftp.deleteRecursive).not.toHaveBeenCalled()
  })
})

describe('TreeNode — new file from context menu', () => {
  it('"New File" appears in directory context menu', async () => {
    renderWithProviders(<TreeNode node={makeDir('src', '/src')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('src') })
    expect(screen.getByText('New File')).toBeInTheDocument()
  })

  it('"New File" is absent from file context menu', async () => {
    renderWithProviders(<TreeNode node={makeFile('index.ts', '/index.ts')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('index.ts') })
    expect(screen.queryByText('New File')).not.toBeInTheDocument()
  })

  it('successful creation triggers listDir and shows new file in expanded folder', async () => {
    const newFile = makeFile('main.ts', '/src/main.ts')
    mockApi.sftp.createFile.mockResolvedValue(undefined)
    mockApi.sftp.listDir.mockResolvedValue([newFile])

    renderWithProviders(<TreeNode node={makeDir('src', '/src')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('src') })
    await userEvent.click(screen.getByText('New File'))

    const input = screen.getByPlaceholderText('filename.ext')
    await userEvent.type(input, 'main.ts')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockApi.sftp.createFile).toHaveBeenCalledWith('sess-1', '/src/main.ts')
      expect(mockApi.sftp.listDir).toHaveBeenCalledWith('sess-1', '/src')
      expect(screen.getByText('main.ts')).toBeInTheDocument()
    })
  })

  it('FILE_EXISTS error shows inline dialog error without closing', async () => {
    mockApi.sftp.createFile.mockRejectedValue(
      Object.assign(new Error('File already exists'), { code: 'FILE_EXISTS' })
    )

    renderWithProviders(<TreeNode node={makeDir('lib', '/lib')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('lib') })
    await userEvent.click(screen.getByText('New File'))

    await userEvent.type(screen.getByPlaceholderText('filename.ext'), 'utils.ts')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText(/already exists/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('filename.ext')).toBeInTheDocument()
    })
    expect(mockApi.sftp.listDir).not.toHaveBeenCalled()
  })

  it('other SFTP error shows notification and closes dialog', async () => {
    mockApi.sftp.createFile.mockRejectedValue(new Error('Permission denied'))

    renderWithProviders(<TreeNode node={makeDir('etc', '/etc')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('etc') })
    await userEvent.click(screen.getByText('New File'))

    await userEvent.type(screen.getByPlaceholderText('filename.ext'), 'hosts')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', expect.stringContaining('Permission denied'))
      expect(screen.queryByPlaceholderText('filename.ext')).not.toBeInTheDocument()
    })
  })
})

describe('TreeNode — upload here context menu', () => {
  it('"Upload files here" and "Upload folder here" appear in file node context menu', async () => {
    renderWithProviders(<TreeNode node={makeFile('index.ts', '/index.ts')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('index.ts') })
    expect(screen.getByText('Upload files here')).toBeInTheDocument()
    expect(screen.getByText('Upload folder here')).toBeInTheDocument()
  })

  it('"Upload files here" and "Upload folder here" appear in directory node context menu', async () => {
    renderWithProviders(<TreeNode node={makeDir('src', '/src')} sessionId="sess-1" />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('src') })
    expect(screen.getByText('Upload files here')).toBeInTheDocument()
    expect(screen.getByText('Upload folder here')).toBeInTheDocument()
  })

  it('calls onUpload with node.path and "files" for a directory node', async () => {
    const onUpload = vi.fn()
    renderWithProviders(<TreeNode node={makeDir('src', '/project/src')} sessionId="sess-1" onUpload={onUpload} />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('src') })
    await userEvent.click(screen.getByText('Upload files here'))
    expect(onUpload).toHaveBeenCalledWith('/project/src', 'files')
  })

  it('calls onUpload with parent directory and "files" for a file node', async () => {
    const onUpload = vi.fn()
    renderWithProviders(<TreeNode node={makeFile('index.ts', '/project/src/index.ts')} sessionId="sess-1" onUpload={onUpload} />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('index.ts') })
    await userEvent.click(screen.getByText('Upload files here'))
    expect(onUpload).toHaveBeenCalledWith('/project/src', 'files')
  })

  it('calls onUpload with "/" and "folder" for a root-level file node', async () => {
    const onUpload = vi.fn()
    renderWithProviders(<TreeNode node={makeFile('readme.md', '/readme.md')} sessionId="sess-1" onUpload={onUpload} />)
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('readme.md') })
    await userEvent.click(screen.getByText('Upload folder here'))
    expect(onUpload).toHaveBeenCalledWith('/', 'folder')
  })
})

describe('TreeNode — rename', () => {
  it('right-click → rename → Enter with new name → api.sftp.rename called, onRename called', async () => {
    const node = makeFile('old.ts', '/old.ts')
    const onRename = vi.fn()
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" onRename={onRename} />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('old.ts') })
    await userEvent.click(screen.getByText('Rename'))

    const input = screen.getByRole('textbox') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, 'new.ts')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockApi.sftp.rename).toHaveBeenCalledWith('sess-1', '/old.ts', '/new.ts')
      expect(onRename).toHaveBeenCalledWith(node, 'new.ts')
    })
  })

  it('Escape cancels rename — no SFTP call', async () => {
    const node = makeFile('index.ts', '/index.ts')
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('index.ts') })
    await userEvent.click(screen.getByText('Rename'))
    await userEvent.keyboard('{Escape}')

    expect(mockApi.sftp.rename).not.toHaveBeenCalled()
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('empty input → no SFTP call, error notification shown', async () => {
    const node = makeFile('main.ts', '/main.ts')
    renderWithProviders(<TreeNode node={node} sessionId="sess-1" />)

    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('main.ts') })
    await userEvent.click(screen.getByText('Rename'))

    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.keyboard('{Enter}')

    expect(mockApi.sftp.rename).not.toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledWith('error', 'Name cannot be empty')
  })
})
