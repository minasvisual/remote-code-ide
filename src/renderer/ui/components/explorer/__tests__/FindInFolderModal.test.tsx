import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FindInFolderModal } from '../FindInFolderModal'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { SearchProgressEvent } from '../../../../domain/ports/IRemoteApi'

let mockApi: ReturnType<typeof createMockApi>

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
const mockOnClose = vi.fn()

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useApp).mockReturnValue({
    activeSession: null, connections: [], notifications: [], isConnecting: false,
    terminalTargetDir: null, clipboard: null,
    loadConnections: vi.fn(), saveConnection: vi.fn(), updateConnection: vi.fn(),
    deleteConnection: vi.fn(), testConnection: vi.fn(), connect: vi.fn(),
    disconnect: vi.fn(), notify: mockNotify, dismissNotification: vi.fn(), updateNotification: vi.fn(),
    openTerminalAt: vi.fn(), registerBeforeDisconnect: vi.fn(),
    copyToClipboard: vi.fn(), clearClipboard: vi.fn(),
  })
  vi.mocked(useEditor).mockReturnValue({
    tabs: [], activeTabId: null, pendingClose: null, openFile: mockOpenFile,
    closeTab: vi.fn(), confirmClose: vi.fn(), setActiveTab: vi.fn(), cycleTab: vi.fn(), updateContent: vi.fn(),
    saveActiveFile: vi.fn(), getDirtyTabsBySession: vi.fn().mockReturnValue([]), isSaving: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mockOpenFile.mockReset()
  mockNotify.mockReset()
  mockOnClose.mockReset()
})

describe('FindInFolderModal', () => {
  it('does not trigger a search when the query is empty', async () => {
    renderWithProviders(<FindInFolderModal sessionId="sess-1" rootPath="/proj" onClose={mockOnClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(mockApi.sftp.searchInFolder).not.toHaveBeenCalled()
  })

  it('renders results incrementally as onSearchProgress events fire', async () => {
    let progressCb: ((event: SearchProgressEvent) => void) | null = null
    mockApi.sftp.onSearchProgress.mockImplementation((cb) => { progressCb = cb; return () => {} })
    mockApi.sftp.searchInFolder.mockResolvedValue({ searchId: 'search-1' })

    renderWithProviders(<FindInFolderModal sessionId="sess-1" rootPath="/proj" onClose={mockOnClose} />)
    await userEvent.type(screen.getByPlaceholderText('Search text...'), 'hello')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(mockApi.sftp.searchInFolder).toHaveBeenCalledWith('sess-1', '/proj', 'hello')
    })

    progressCb?.({
      searchId: 'search-1',
      type: 'match',
      result: { path: '/proj/a.txt', name: 'a.txt', totalMatches: 1, matches: [{ line: 1, text: 'hello world' }] }
    })

    await waitFor(() => {
      expect(screen.getByText('a.txt')).toBeInTheDocument()
      expect(screen.getByText('/proj/a.txt')).toBeInTheDocument()
    })
  })

  it('clicking a result calls openFile and onClose', async () => {
    let progressCb: ((event: SearchProgressEvent) => void) | null = null
    mockApi.sftp.onSearchProgress.mockImplementation((cb) => { progressCb = cb; return () => {} })
    mockApi.sftp.searchInFolder.mockResolvedValue({ searchId: 'search-1' })

    renderWithProviders(<FindInFolderModal sessionId="sess-1" rootPath="/proj" onClose={mockOnClose} />)
    await userEvent.type(screen.getByPlaceholderText('Search text...'), 'hello')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(mockApi.sftp.searchInFolder).toHaveBeenCalled())

    progressCb?.({
      searchId: 'search-1',
      type: 'match',
      result: { path: '/proj/a.txt', name: 'a.txt', totalMatches: 1, matches: [{ line: 1, text: 'hello world' }] }
    })

    await waitFor(() => screen.getByText('a.txt'))
    await userEvent.click(screen.getByText('a.txt'))

    expect(mockOpenFile).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'a.txt', path: '/proj/a.txt', type: 'file' }),
      'sess-1'
    )
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('starting a new search while one is in flight cancels the previous searchId and clears prior results', async () => {
    let progressCb: ((event: SearchProgressEvent) => void) | null = null
    mockApi.sftp.onSearchProgress.mockImplementation((cb) => { progressCb = cb; return () => {} })
    mockApi.sftp.searchInFolder
      .mockResolvedValueOnce({ searchId: 'search-1' })
      .mockResolvedValueOnce({ searchId: 'search-2' })

    renderWithProviders(<FindInFolderModal sessionId="sess-1" rootPath="/proj" onClose={mockOnClose} />)
    const input = screen.getByPlaceholderText('Search text...')

    await userEvent.type(input, 'hello')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(mockApi.sftp.searchInFolder).toHaveBeenCalledWith('sess-1', '/proj', 'hello'))

    progressCb?.({
      searchId: 'search-1',
      type: 'match',
      result: { path: '/proj/a.txt', name: 'a.txt', totalMatches: 1, matches: [{ line: 1, text: 'hello world' }] }
    })
    await waitFor(() => screen.getByText('a.txt'))

    // Cancel button replaces Search while a search is in flight; Enter still submits the form.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument())
    await userEvent.clear(input)
    await userEvent.type(input, 'world{Enter}')

    await waitFor(() => {
      expect(mockApi.sftp.cancelSearch).toHaveBeenCalledWith('search-1')
      expect(mockApi.sftp.searchInFolder).toHaveBeenCalledWith('sess-1', '/proj', 'world')
    })
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
  })
})
