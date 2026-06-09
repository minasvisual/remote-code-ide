import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditorTabBar } from '../EditorTabBar'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { EditorTab } from '../../../../domain/entities/EditorTab'

let mockApi: ReturnType<typeof createMockApi>

vi.mock('../../../../application/contexts/EditorContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/EditorContext')>()
  return { ...original, useEditor: vi.fn() }
})

import { useEditor } from '../../../../application/contexts/EditorContext'

const mockSetActiveTab = vi.fn()
const mockCloseTab = vi.fn()

function makeTab(overrides: Partial<EditorTab> = {}): EditorTab {
  return {
    id: 'tab-1',
    sessionId: 'sess-1',
    remotePath: '/app.ts',
    localTempPath: '/tmp/app.ts',
    filename: 'app.ts',
    language: 'typescript',
    content: '',
    isDirty: false,
    isLoading: false,
    isSaving: false,
    ...overrides,
  }
}

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.mocked(useEditor).mockReturnValue({
    tabs: [],
    activeTabId: null,
    openFile: vi.fn(),
    closeTab: mockCloseTab,
    setActiveTab: mockSetActiveTab,
    updateContent: vi.fn(),
    saveActiveFile: vi.fn(),
    isSaving: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mockSetActiveTab.mockReset()
  mockCloseTab.mockReset()
})

describe('EditorTabBar', () => {
  it('renders nothing when there are no tabs', () => {
    const { container } = renderWithProviders(<EditorTabBar />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tab with filename', () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab({ filename: 'index.ts' })],
      activeTabId: 'tab-1',
      openFile: vi.fn(), closeTab: mockCloseTab, setActiveTab: mockSetActiveTab,
      updateContent: vi.fn(), saveActiveFile: vi.fn(), isSaving: false,
    })
    renderWithProviders(<EditorTabBar />)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('shows dirty indicator when tab has unsaved changes', () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab({ isDirty: true, filename: 'app.ts' })],
      activeTabId: 'tab-1',
      openFile: vi.fn(), closeTab: mockCloseTab, setActiveTab: mockSetActiveTab,
      updateContent: vi.fn(), saveActiveFile: vi.fn(), isSaving: false,
    })
    renderWithProviders(<EditorTabBar />)
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('calls setActiveTab when a tab is clicked', async () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab({ id: 'tab-42', filename: 'server.ts' })],
      activeTabId: null,
      openFile: vi.fn(), closeTab: mockCloseTab, setActiveTab: mockSetActiveTab,
      updateContent: vi.fn(), saveActiveFile: vi.fn(), isSaving: false,
    })
    renderWithProviders(<EditorTabBar />)
    await userEvent.click(screen.getByText('server.ts'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('tab-42')
  })

  it('calls closeTab when ✕ button is clicked', async () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab({ id: 'tab-99', filename: 'config.ts' })],
      activeTabId: 'tab-99',
      openFile: vi.fn(), closeTab: mockCloseTab, setActiveTab: mockSetActiveTab,
      updateContent: vi.fn(), saveActiveFile: vi.fn(), isSaving: false,
    })
    renderWithProviders(<EditorTabBar />)
    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(mockCloseTab).toHaveBeenCalledWith('tab-99')
  })

  it('renders multiple tabs', () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab({ id: 't1', filename: 'a.ts' }), makeTab({ id: 't2', filename: 'b.ts' })],
      activeTabId: 't1',
      openFile: vi.fn(), closeTab: mockCloseTab, setActiveTab: mockSetActiveTab,
      updateContent: vi.fn(), saveActiveFile: vi.fn(), isSaving: false,
    })
    renderWithProviders(<EditorTabBar />)
    expect(screen.getByText('a.ts')).toBeInTheDocument()
    expect(screen.getByText('b.ts')).toBeInTheDocument()
  })
})
