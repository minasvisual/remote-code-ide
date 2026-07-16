import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FilePropertiesModal } from '../FilePropertiesModal'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { FileNode } from '../../../../domain/entities/FileNode'
import type { FileInfo } from '../../../../domain/ports/IRemoteApi'

let mockApi: ReturnType<typeof createMockApi>

function makeFileNode(name: string, path: string, type: FileNode['type'] = 'file'): FileNode {
  return { name, path, type, size: 0, modifiedAt: '', permissions: '', isLoaded: false }
}

function makeFileInfo(overrides: Partial<FileInfo> = {}): FileInfo {
  return {
    name: 'app.ts',
    path: '/project/app.ts',
    type: 'file',
    size: 493212,
    permissions: '644',
    owner: 1000,
    group: 1000,
    modifiedAt: '2026-01-01T00:00:00.000Z',
    accessedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('FilePropertiesModal — loading', () => {
  it('shows a spinner while the request is in flight', async () => {
    let resolveInfo: (info: FileInfo) => void = () => {}
    mockApi.sftp.getFileInfo.mockReturnValue(new Promise((resolve) => { resolveInfo = resolve }))

    const { container } = renderWithProviders(
      <FilePropertiesModal node={makeFileNode('app.ts', '/project/app.ts')} sessionId="sess-1" onClose={vi.fn()} />
    )

    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    resolveInfo(makeFileInfo())
    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    })
  })
})

describe('FilePropertiesModal — file', () => {
  it('shows extension, formatted size, and symbolic permissions for a file', async () => {
    mockApi.sftp.getFileInfo.mockResolvedValue(
      makeFileInfo({ name: 'app.ts', path: '/project/app.ts', type: 'file', size: 493212, permissions: '644' })
    )

    renderWithProviders(
      <FilePropertiesModal node={makeFileNode('app.ts', '/project/app.ts')} sessionId="sess-1" onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(mockApi.sftp.getFileInfo).toHaveBeenCalledWith('sess-1', '/project/app.ts')
    })

    expect(screen.getByText('ts')).toBeInTheDocument()
    expect(screen.getByText(/KB/)).toBeInTheDocument()
    expect(screen.getByText(/493,212 bytes/)).toBeInTheDocument()
    expect(screen.getByText(/644.*rw-r--r--/)).toBeInTheDocument()
    expect(screen.queryByText(/items/)).not.toBeInTheDocument()
  })
})

describe('FilePropertiesModal — directory', () => {
  it('shows the item count for a folder', async () => {
    mockApi.sftp.getFileInfo.mockResolvedValue(
      makeFileInfo({ name: 'src', path: '/project/src', type: 'directory', size: 0, itemCount: 5 })
    )

    renderWithProviders(
      <FilePropertiesModal node={makeFileNode('src', '/project/src', 'directory')} sessionId="sess-1" onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('5 items')).toBeInTheDocument()
    })
  })
})

describe('FilePropertiesModal — symlink', () => {
  it('shows the symlink target when present', async () => {
    mockApi.sftp.getFileInfo.mockResolvedValue(
      makeFileInfo({ name: 'link', path: '/project/link', type: 'symlink', symlinkTarget: '/project/real-file.ts' })
    )

    renderWithProviders(
      <FilePropertiesModal node={makeFileNode('link', '/project/link', 'symlink')} sessionId="sess-1" onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('/project/real-file.ts')).toBeInTheDocument()
    })
  })

  it('shows "—" when the symlink target is unavailable', async () => {
    mockApi.sftp.getFileInfo.mockResolvedValue(
      makeFileInfo({ name: 'link', path: '/project/link', type: 'symlink', symlinkTarget: undefined })
    )

    renderWithProviders(
      <FilePropertiesModal node={makeFileNode('link', '/project/link', 'symlink')} sessionId="sess-1" onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })
})

describe('FilePropertiesModal — error', () => {
  it('shows an inline error message without closing the modal when getFileInfo rejects', async () => {
    mockApi.sftp.getFileInfo.mockRejectedValue(new Error('Session disconnected'))
    const onClose = vi.fn()

    renderWithProviders(
      <FilePropertiesModal node={makeFileNode('app.ts', '/project/app.ts')} sessionId="sess-1" onClose={onClose} />
    )

    await waitFor(() => {
      expect(screen.getByText(/Session disconnected/)).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
