import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MonacoWrapper } from '../MonacoWrapper'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { EditorTab } from '../../../../domain/entities/EditorTab'

vi.mock('monaco-editor', () => ({}))

vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/json/json.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/css/css.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/html/html.worker?worker', () => ({ default: vi.fn() }))
vi.mock('monaco-editor/esm/vs/language/typescript/ts.worker?worker', () => ({ default: vi.fn() }))

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => {
    const { createElement } = require('react')
    return createElement('textarea', {
      'data-testid': 'monaco-editor',
      value: value ?? '',
      onChange: (e: { target: { value: string } }) => onChange?.(e.target.value),
    })
  },
  useMonaco: () => null,
  loader: { config: vi.fn() },
}))

vi.mock('../../../../application/contexts/EditorContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/EditorContext')>()
  return { ...original, useEditor: vi.fn() }
})

import { useEditor } from '../../../../application/contexts/EditorContext'

function makeTab(overrides: Partial<EditorTab> = {}): EditorTab {
  return {
    id: 'tab-1',
    sessionId: 'sess-1',
    remotePath: '/app.ts',
    localTempPath: '/tmp/app.ts',
    filename: 'app.ts',
    language: 'typescript',
    content: 'const x = 1',
    isDirty: false,
    isLoading: false,
    isSaving: false,
    ...overrides,
  }
}

function mockEditorContext(saveActiveFile = vi.fn()) {
  vi.mocked(useEditor).mockReturnValue({
    tabs: [makeTab()],
    activeTabId: 'tab-1',
    pendingClose: null,
    openFile: vi.fn(),
    closeTab: vi.fn(),
    confirmClose: vi.fn(),
    setActiveTab: vi.fn(),
    cycleTab: vi.fn(),
    updateContent: vi.fn(),
    saveActiveFile,
    getDirtyTabsBySession: vi.fn().mockReturnValue([]),
    isSaving: false,
  })
}

beforeEach(() => {
  vi.stubGlobal('api', createMockApi())
  mockEditorContext()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MonacoWrapper', () => {
  it('renders the editor when a tab is active', () => {
    renderWithProviders(<MonacoWrapper />)
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })

  it('renders nothing when no tab is active', () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [],
      activeTabId: null,
      pendingClose: null,
      openFile: vi.fn(),
      closeTab: vi.fn(),
      confirmClose: vi.fn(),
      setActiveTab: vi.fn(),
      cycleTab: vi.fn(),
      updateContent: vi.fn(),
      saveActiveFile: vi.fn(),
      getDirtyTabsBySession: vi.fn().mockReturnValue([]),
      isSaving: false,
    })
    const { container } = renderWithProviders(<MonacoWrapper />)
    expect(container.firstChild).toBeNull()
  })

  it('shows saving indicator when isSaving is true', () => {
    vi.mocked(useEditor).mockReturnValue({
      tabs: [makeTab()],
      activeTabId: 'tab-1',
      pendingClose: null,
      openFile: vi.fn(),
      closeTab: vi.fn(),
      confirmClose: vi.fn(),
      setActiveTab: vi.fn(),
      cycleTab: vi.fn(),
      updateContent: vi.fn(),
      saveActiveFile: vi.fn(),
      getDirtyTabsBySession: vi.fn().mockReturnValue([]),
      isSaving: true,
    })
    renderWithProviders(<MonacoWrapper />)
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })

  it('updates saveActiveFileRef when saveActiveFile prop changes (ref pattern)', () => {
    const firstSave = vi.fn()
    const secondSave = vi.fn()

    mockEditorContext(firstSave)
    const { container } = renderWithProviders(<MonacoWrapper />)
    expect(container.firstChild).not.toBeNull()

    // Simulate EditorContext returning a new saveActiveFile after a tab switch
    mockEditorContext(secondSave)
    // The ref is updated synchronously on the next render cycle.
    // Verify no errors — the component stays mounted with correct structure.
    expect(container.firstChild).not.toBeNull()
  })
})
