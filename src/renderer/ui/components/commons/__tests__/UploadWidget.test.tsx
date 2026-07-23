import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UploadWidget } from '../UploadWidget'
import type { UploadBatch } from '../../../../application/contexts/AppContext'

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useApp } from '../../../../application/contexts/AppContext'

const mockDismissUpload = vi.fn()

function makeBatch(overrides: Partial<UploadBatch> = {}): UploadBatch {
  return {
    id: 'batch-1',
    targetDir: '/var/www',
    entries: [],
    ...overrides,
  }
}

function mockUploadBatches(batches: UploadBatch[]) {
  vi.mocked(useApp).mockReturnValue({
    connections: [], activeSession: null, notifications: [], isConnecting: false,
    terminalTargetDir: null, clipboard: null,
    uploadBatches: batches, uploadRefreshSignal: null,
    loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
    deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
    disconnect: vi.fn(), notify: vi.fn(), dismissNotification: vi.fn(), updateNotification: vi.fn(),
    openTerminalAt: vi.fn(), registerBeforeDisconnect: vi.fn(),
    copyToClipboard: vi.fn(), clearClipboard: vi.fn(),
    startUpload: vi.fn(), dismissUpload: mockDismissUpload,
  })
}

beforeEach(() => {
  mockDismissUpload.mockClear()
})

describe('UploadWidget', () => {
  it('renders nothing when there are no upload batches', () => {
    mockUploadBatches([])
    const { container } = render(<UploadWidget />)
    expect(container.firstChild).toBeNull()
  })

  it('renders collapsed by default with a summary instead of the file list', () => {
    mockUploadBatches([
      makeBatch({
        entries: [
          { remoteName: 'a.txt', status: 'done' },
          { remoteName: 'b.txt', status: 'uploading' },
        ],
      }),
    ])
    render(<UploadWidget />)
    expect(screen.getByText(/Uploading 1 of 2 files/)).toBeInTheDocument()
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
  })

  it('expands to show the file list when the toggle is clicked', async () => {
    mockUploadBatches([
      makeBatch({
        entries: [
          { remoteName: 'a.txt', status: 'done' },
          { remoteName: 'b.txt', status: 'uploading' },
        ],
      }),
    ])
    render(<UploadWidget />)
    await userEvent.click(screen.getByTitle('Expand'))
    expect(screen.getByText('a.txt')).toBeInTheDocument()
    expect(screen.getByText('b.txt')).toBeInTheDocument()
  })

  it('collapses again when the toggle is clicked a second time', async () => {
    mockUploadBatches([makeBatch({ entries: [{ remoteName: 'a.txt', status: 'done' }] })])
    render(<UploadWidget />)
    await userEvent.click(screen.getByTitle('Expand'))
    expect(screen.getByText('a.txt')).toBeInTheDocument()
    await userEvent.click(screen.getByTitle('Collapse'))
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
  })

  it('never disables the expand/collapse toggle, even mid-upload', () => {
    mockUploadBatches([makeBatch({ entries: [{ remoteName: 'a.txt', status: 'uploading' }] })])
    render(<UploadWidget />)
    expect(screen.getByTitle('Expand')).not.toBeDisabled()
  })

  it('disables the close button while any entry is pending or uploading', () => {
    mockUploadBatches([
      makeBatch({
        entries: [
          { remoteName: 'a.txt', status: 'done' },
          { remoteName: 'b.txt', status: 'pending' },
        ],
      }),
    ])
    render(<UploadWidget />)
    expect(screen.getByTitle('Close')).toBeDisabled()
  })

  it('enables the close button and dismisses all batches once everything is done/error', async () => {
    mockUploadBatches([
      makeBatch({
        id: 'batch-1',
        entries: [
          { remoteName: 'a.txt', status: 'done' },
          { remoteName: 'b.txt', status: 'error', error: 'Permission denied' },
        ],
      }),
    ])
    render(<UploadWidget />)
    const closeButton = screen.getByTitle('Close')
    expect(closeButton).not.toBeDisabled()
    await userEvent.click(closeButton)
    expect(mockDismissUpload).toHaveBeenCalledWith('batch-1')
  })

  it('shows multiple concurrent batches, each under its own target directory, when expanded', async () => {
    mockUploadBatches([
      makeBatch({ id: 'batch-1', targetDir: '/var/www', entries: [{ remoteName: 'a.txt', status: 'done' }] }),
      makeBatch({ id: 'batch-2', targetDir: '/etc', entries: [{ remoteName: 'b.conf', status: 'uploading' }] }),
    ])
    render(<UploadWidget />)
    await userEvent.click(screen.getByTitle('Expand'))
    expect(screen.getByText('/var/www')).toBeInTheDocument()
    expect(screen.getByText('/etc')).toBeInTheDocument()
    expect(screen.getByText('a.txt')).toBeInTheDocument()
    expect(screen.getByText('b.conf')).toBeInTheDocument()
  })

  it('shows an inline error message for failed entries when expanded', async () => {
    mockUploadBatches([
      makeBatch({ entries: [{ remoteName: 'a.txt', status: 'error', error: 'Permission denied' }] }),
    ])
    render(<UploadWidget />)
    await userEvent.click(screen.getByTitle('Expand'))
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
  })
})
