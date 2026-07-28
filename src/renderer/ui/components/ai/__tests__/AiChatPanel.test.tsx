import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiChatPanel } from '../AiChatPanel'
import { createMockApi, createMockAiProviderConfig } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'
import type { ChatUIMessage } from '../../../../application/contexts/AiChatContext'
import type { EditorTab } from '../../../../domain/entities/EditorTab'

vi.mock('../../../../application/contexts/AiChatContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AiChatContext')>()
  return { ...original, useAiChat: vi.fn() }
})

vi.mock('../../../../application/contexts/EditorContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/EditorContext')>()
  return { ...original, useEditor: vi.fn() }
})

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useAiChat } from '../../../../application/contexts/AiChatContext'
import { useEditor } from '../../../../application/contexts/EditorContext'
import { useApp } from '../../../../application/contexts/AppContext'

const mockSendMessage = vi.fn()
const mockCancel = vi.fn()
const mockUpdateContent = vi.fn()

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

const mockApproveTool = vi.fn()
const mockDenyTool = vi.fn()
const mockSetAgentMode = vi.fn()
const mockSetAutoApproveThisTurn = vi.fn()

function mockAiChat(overrides: {
  providers?: ReturnType<typeof createMockAiProviderConfig>[]
  messages?: ChatUIMessage[]
  isSending?: boolean
  agentMode?: boolean
  agentModeAvailable?: boolean
  autoApproveThisTurn?: boolean
} = {}) {
  vi.mocked(useAiChat).mockReturnValue({
    providers: overrides.providers ?? [createMockAiProviderConfig()],
    messages: overrides.messages ?? [],
    isSending: overrides.isSending ?? false,
    agentMode: overrides.agentMode ?? false,
    setAgentMode: mockSetAgentMode,
    autoApproveThisTurn: overrides.autoApproveThisTurn ?? false,
    setAutoApproveThisTurn: mockSetAutoApproveThisTurn,
    agentModeAvailable: overrides.agentModeAvailable ?? false,
    refreshProviders: vi.fn(),
    saveProvider: vi.fn(),
    updateProvider: vi.fn(),
    deleteProvider: vi.fn(),
    setDefaultProvider: vi.fn(),
    testProvider: vi.fn(),
    sendMessage: mockSendMessage,
    cancel: mockCancel,
    approveTool: mockApproveTool,
    denyTool: mockDenyTool,
  })
}

function mockEditor(tabs: EditorTab[] = [makeTab()]) {
  vi.mocked(useEditor).mockReturnValue({
    tabs,
    activeTabId: tabs[0]?.id ?? null,
    pendingClose: null,
    openFile: vi.fn(),
    closeTab: vi.fn(),
    confirmClose: vi.fn(),
    setActiveTab: vi.fn(),
    cycleTab: vi.fn(),
    updateContent: mockUpdateContent,
    saveActiveFile: vi.fn(),
    getDirtyTabsBySession: vi.fn().mockReturnValue([]),
    isSaving: false,
  })
}

const mockNotify = vi.fn()

function mockApp(activeSession: { sessionId: string } | null = null) {
  // EditorProvider/AiChatProvider (rendered for real by renderWithProviders) also call
  // useApp() internally — this mock must satisfy their needs too, not just AiChatPanel's.
  vi.mocked(useApp).mockReturnValue({
    activeSession,
    notify: mockNotify,
    registerBeforeDisconnect: vi.fn()
  } as unknown as ReturnType<typeof useApp>)
}

beforeEach(() => {
  vi.stubGlobal('api', createMockApi())
  mockAiChat()
  mockEditor()
  mockApp()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mockSendMessage.mockReset()
  mockCancel.mockReset()
  mockUpdateContent.mockReset()
  mockApproveTool.mockReset()
  mockDenyTool.mockReset()
  mockNotify.mockReset()
  mockSetAgentMode.mockReset()
  mockSetAutoApproveThisTurn.mockReset()
})

describe('AiChatPanel', () => {
  it('shows a guidance state when no provider is configured', () => {
    mockAiChat({ providers: [] })
    renderWithProviders(<AiChatPanel />)
    expect(screen.getByText('Configure an AI provider to start chatting.')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Message the assistant…')).not.toBeInTheDocument()
  })

  it('opens provider settings from the empty state', async () => {
    mockAiChat({ providers: [] })
    renderWithProviders(<AiChatPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'Configure Provider' }))
    expect(screen.getByText('AI Providers')).toBeInTheDocument()
  })

  it('opens provider settings from the gear icon', async () => {
    renderWithProviders(<AiChatPanel />)
    await userEvent.click(screen.getByTitle('AI provider settings'))
    expect(screen.getByText('AI Providers')).toBeInTheDocument()
  })

  it('renders user and assistant messages', () => {
    mockAiChat({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', status: 'done' },
        { id: 'm2', role: 'assistant', content: 'Hi there', status: 'done' },
      ],
    })
    renderWithProviders(<AiChatPanel />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('shows an error message for a failed turn', () => {
    mockAiChat({
      messages: [{ id: 'm1', role: 'assistant', content: '', status: 'error', error: 'network down' }],
    })
    renderWithProviders(<AiChatPanel />)
    expect(screen.getByText('Error: network down')).toBeInTheDocument()
  })

  it('shows a cancelled indicator for a cancelled turn', () => {
    mockAiChat({
      messages: [{ id: 'm1', role: 'assistant', content: 'partial', status: 'cancelled' }],
    })
    renderWithProviders(<AiChatPanel />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('sends the typed message and clears the input', async () => {
    renderWithProviders(<AiChatPanel />)
    const textarea = screen.getByPlaceholderText('Message the assistant…')
    await userEvent.type(textarea, 'What does this file do?')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(mockSendMessage).toHaveBeenCalledWith('What does this file do?')
    expect(textarea).toHaveValue('')
  })

  it('sends the message on Enter and inserts a newline on Shift+Enter', async () => {
    renderWithProviders(<AiChatPanel />)
    const textarea = screen.getByPlaceholderText('Message the assistant…')
    await userEvent.type(textarea, 'line one{Enter}')
    expect(mockSendMessage).toHaveBeenCalledWith('line one')
  })

  it('shows Cancel instead of Send while a turn is in flight, and cancels on click', async () => {
    mockAiChat({ isSending: true })
    renderWithProviders(<AiChatPanel />)
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockCancel).toHaveBeenCalled()
  })

  it('shows a review action for a completed message proposing an edit to an open tab, and accepts it', async () => {
    mockEditor([makeTab({ id: 'tab-1', remotePath: '/app.ts', content: 'old content' })])
    mockAiChat({
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Here you go:\n```/app.ts\nnew content\n```',
          status: 'done',
        },
      ],
    })
    renderWithProviders(<AiChatPanel />)

    const reviewButton = screen.getByRole('button', { name: 'Review edit to /app.ts' })
    await userEvent.click(reviewButton)
    expect(screen.getByText('Proposed edit — /app.ts')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(mockUpdateContent).toHaveBeenCalledWith('tab-1', 'new content')
    await waitFor(() => {
      expect(screen.queryByText('Proposed edit — /app.ts')).not.toBeInTheDocument()
    })
  })

  it('discards the proposal on reject without updating the tab', async () => {
    mockEditor([makeTab({ id: 'tab-1', remotePath: '/app.ts', content: 'old content' })])
    mockAiChat({
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Here you go:\n```/app.ts\nnew content\n```',
          status: 'done',
        },
      ],
    })
    renderWithProviders(<AiChatPanel />)

    await userEvent.click(screen.getByRole('button', { name: 'Review edit to /app.ts' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(mockUpdateContent).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText('Proposed edit — /app.ts')).not.toBeInTheDocument()
    })
  })

  it('does not show a review action when the response has no matching file block', () => {
    mockAiChat({
      messages: [{ id: 'm1', role: 'assistant', content: 'Just a plain reply, no code.', status: 'done' }],
    })
    renderWithProviders(<AiChatPanel />)
    expect(screen.queryByText(/Review edit to/)).not.toBeInTheDocument()
  })

  describe('agent mode', () => {
    it('disables the Agent mode checkbox when unavailable', () => {
      mockAiChat({ agentModeAvailable: false })
      renderWithProviders(<AiChatPanel />)
      expect(screen.getByLabelText(/Agent mode/i)).toBeDisabled()
    })

    it('enables the Agent mode checkbox and reports toggles when available', async () => {
      mockAiChat({ agentModeAvailable: true })
      renderWithProviders(<AiChatPanel />)
      const checkbox = screen.getByLabelText(/Agent mode/i)
      expect(checkbox).not.toBeDisabled()
      await userEvent.click(checkbox)
      expect(mockSetAgentMode).toHaveBeenCalledWith(true)
    })

    it('only shows the auto-approve toggle while Agent mode is on', () => {
      mockAiChat({ agentModeAvailable: true, agentMode: false })
      const { rerender } = renderWithProviders(<AiChatPanel />)
      expect(screen.queryByLabelText(/Auto-approve this turn/i)).not.toBeInTheDocument()

      mockAiChat({ agentModeAvailable: true, agentMode: true })
      rerender(<AiChatPanel />)
      expect(screen.getByLabelText(/Auto-approve this turn/i)).toBeInTheDocument()
    })

    it('shows Allow/Deny for a pending run_command call and reports the decision', async () => {
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [{ id: 'call-1', name: 'run_command', input: { command: 'ls -la' }, status: 'pending', autoApproved: false }],
          },
        ],
      })
      renderWithProviders(<AiChatPanel />)
      expect(screen.getByText('ls -la')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Allow' }))
      expect(mockApproveTool).toHaveBeenCalledWith('call-1')
    })

    it('denying a pending run_command call reports the decision without approving', async () => {
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [{ id: 'call-1', name: 'run_command', input: { command: 'rm -rf /' }, status: 'pending', autoApproved: false }],
          },
        ],
      })
      renderWithProviders(<AiChatPanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Deny' }))
      expect(mockDenyTool).toHaveBeenCalledWith('call-1')
      expect(mockApproveTool).not.toHaveBeenCalled()
    })

    it('marks an auto-approved completed tool call in the trace', () => {
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'done',
            toolCalls: [
              {
                id: 'call-1',
                name: 'run_command',
                input: { command: 'ls' },
                status: 'done',
                result: { content: 'exit code: 0', isError: false },
                autoApproved: true,
              },
            ],
          },
        ],
      })
      renderWithProviders(<AiChatPanel />)
      expect(screen.getByText('auto-approved')).toBeInTheDocument()
    })

    it('shows a distinct message when the agent stops at the step limit', () => {
      mockAiChat({
        messages: [{ id: 'm1', role: 'assistant', content: 'partial work', status: 'step_limit' }],
      })
      renderWithProviders(<AiChatPanel />)
      expect(screen.getByText(/Agent stopped after reaching the step limit/i)).toBeInTheDocument()
    })

    it('automatically shows the diff modal for a pending write_file call (no button click needed)', () => {
      mockEditor([])
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [
              {
                id: 'call-2',
                name: 'write_file',
                input: { path: '/new.ts', currentContent: 'old', proposedContent: 'new' },
                status: 'pending',
                autoApproved: false
              }
            ]
          }
        ]
      })
      renderWithProviders(<AiChatPanel />)
      expect(screen.getByText('Proposed edit — /new.ts')).toBeInTheDocument()
    })

    it('writes directly via SFTP and approves when accepting a write_file diff with no open tab', async () => {
      mockEditor([])
      mockApp({ sessionId: 'sess-1' })
      const api = createMockApi()
      vi.stubGlobal('api', api)
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [
              {
                id: 'call-2',
                name: 'write_file',
                input: { path: '/new.ts', currentContent: '', proposedContent: 'new content' },
                status: 'pending',
                autoApproved: false
              }
            ]
          }
        ]
      })
      renderWithProviders(<AiChatPanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
      await waitFor(() => {
        expect(api.sftp.writeFile).toHaveBeenCalledWith('sess-1', '/new.ts', 'new content')
        expect(mockApproveTool).toHaveBeenCalledWith('call-2')
      })
    })

    it('updates the open tab (not SFTP) when accepting a write_file diff for an open tab', async () => {
      mockEditor([makeTab({ id: 'tab-1', remotePath: '/app.ts', content: 'old' })])
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [
              {
                id: 'call-3',
                name: 'write_file',
                input: { path: '/app.ts', currentContent: 'old', proposedContent: 'updated' },
                status: 'pending',
                autoApproved: false
              }
            ]
          }
        ]
      })
      renderWithProviders(<AiChatPanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
      expect(mockUpdateContent).toHaveBeenCalledWith('tab-1', 'updated')
      expect(mockApproveTool).toHaveBeenCalledWith('call-3')
    })

    it('denies without writing anything when rejecting a write_file diff', async () => {
      mockEditor([])
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [
              {
                id: 'call-4',
                name: 'write_file',
                input: { path: '/x.ts', currentContent: '', proposedContent: 'y' },
                status: 'pending',
                autoApproved: false
              }
            ]
          }
        ]
      })
      renderWithProviders(<AiChatPanel />)
      await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
      expect(mockDenyTool).toHaveBeenCalledWith('call-4')
      expect(mockUpdateContent).not.toHaveBeenCalled()
    })

    it('auto-commits an auto-approved write_file call without showing the diff modal', async () => {
      mockEditor([makeTab({ id: 'tab-1', remotePath: '/app.ts', content: 'old' })])
      mockAiChat({
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '',
            status: 'streaming',
            toolCalls: [
              {
                id: 'call-5',
                name: 'write_file',
                input: { path: '/app.ts', currentContent: 'old', proposedContent: 'auto-updated' },
                status: 'pending',
                autoApproved: true
              }
            ]
          }
        ]
      })
      renderWithProviders(<AiChatPanel />)
      expect(screen.queryByText('Proposed edit — /app.ts')).not.toBeInTheDocument()
      await waitFor(() => {
        expect(mockUpdateContent).toHaveBeenCalledWith('tab-1', 'auto-updated')
        expect(mockApproveTool).toHaveBeenCalledWith('call-5')
      })
    })
  })
})
