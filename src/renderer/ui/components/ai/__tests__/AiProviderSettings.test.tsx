import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AiProviderSettings } from '../AiProviderSettings'
import { createMockAiProviderConfig } from '../../../../__tests__/helpers/mockApi'

vi.mock('../../../../application/contexts/AiChatContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AiChatContext')>()
  return { ...original, useAiChat: vi.fn() }
})

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useAiChat } from '../../../../application/contexts/AiChatContext'
import { useApp } from '../../../../application/contexts/AppContext'

const mockNotify = vi.fn()
const mockSaveProvider = vi.fn()
const mockUpdateProvider = vi.fn()
const mockDeleteProvider = vi.fn()
const mockSetDefaultProvider = vi.fn()
const mockTestProvider = vi.fn()

function mockAiChat(providers: ReturnType<typeof createMockAiProviderConfig>[] = []) {
  vi.mocked(useAiChat).mockReturnValue({
    providers,
    messages: [],
    isSending: false,
    agentMode: false,
    setAgentMode: vi.fn(),
    autoApproveThisTurn: false,
    setAutoApproveThisTurn: vi.fn(),
    agentModeAvailable: false,
    refreshProviders: vi.fn(),
    saveProvider: mockSaveProvider,
    updateProvider: mockUpdateProvider,
    deleteProvider: mockDeleteProvider,
    setDefaultProvider: mockSetDefaultProvider,
    testProvider: mockTestProvider,
    sendMessage: vi.fn(),
    cancel: vi.fn(),
    approveTool: vi.fn(),
    denyTool: vi.fn(),
  })
}

beforeEach(() => {
  vi.mocked(useApp).mockReturnValue({ notify: mockNotify } as unknown as ReturnType<typeof useApp>)
  mockSaveProvider.mockResolvedValue(createMockAiProviderConfig())
  mockUpdateProvider.mockResolvedValue(createMockAiProviderConfig())
  mockTestProvider.mockResolvedValue({ success: true, message: 'Connection successful' })
  mockAiChat()
})

afterEach(() => {
  vi.restoreAllMocks()
  mockNotify.mockReset()
  mockSaveProvider.mockReset()
  mockUpdateProvider.mockReset()
  mockDeleteProvider.mockReset()
  mockSetDefaultProvider.mockReset()
  mockTestProvider.mockReset()
})

describe('AiProviderSettings', () => {
  it('shows an empty state when no providers are configured', () => {
    render(<AiProviderSettings onClose={vi.fn()} />)
    expect(screen.getByText('No AI providers configured yet.')).toBeInTheDocument()
  })

  it('lists configured providers with label, type and model', () => {
    mockAiChat([createMockAiProviderConfig({ label: 'My Claude', providerType: 'anthropic', model: 'claude-sonnet-4-5' })])
    render(<AiProviderSettings onClose={vi.fn()} />)
    expect(screen.getByText('My Claude')).toBeInTheDocument()
    expect(screen.getByText('anthropic · claude-sonnet-4-5')).toBeInTheDocument()
  })

  it('notifies an error and does not save when required fields are missing', async () => {
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ New Provider' }))
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', 'Label, model and API key are required')
    })
    expect(mockSaveProvider).not.toHaveBeenCalled()
  })

  it('requires a base URL for openai-compatible providers', async () => {
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ New Provider' }))
    await userEvent.click(screen.getByRole('radio', { name: 'OpenAI-compatible' }))
    await userEvent.type(screen.getByPlaceholderText('My Anthropic Key'), 'Local model')
    await userEvent.type(screen.getByPlaceholderText('claude-sonnet-4-5'), 'llama3')
    await userEvent.type(screen.getByPlaceholderText('sk-…'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', 'Base URL is required for OpenAI-compatible providers')
    })
    expect(mockSaveProvider).not.toHaveBeenCalled()
  })

  it('saves a new provider with the entered fields', async () => {
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ New Provider' }))
    await userEvent.type(screen.getByPlaceholderText('My Anthropic Key'), 'My Anthropic Key')
    await userEvent.type(screen.getByPlaceholderText('claude-sonnet-4-5'), 'claude-sonnet-4-5')
    await userEvent.type(screen.getByPlaceholderText('sk-…'), 'sk-ant-test')
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))

    await waitFor(() => {
      expect(mockSaveProvider).toHaveBeenCalledWith({
        label: 'My Anthropic Key',
        providerType: 'anthropic',
        baseUrl: undefined,
        model: 'claude-sonnet-4-5',
        plainApiKey: 'sk-ant-test',
      })
    })
  })

  it('pre-fills the edit form without the API key and updates on save', async () => {
    const provider = createMockAiProviderConfig({ label: 'My Claude', model: 'claude-sonnet-4-5' })
    mockAiChat([provider])
    render(<AiProviderSettings onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByDisplayValue('My Claude')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Leave blank to keep current')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => {
      expect(mockUpdateProvider).toHaveBeenCalledWith({
        id: provider.id,
        label: 'My Claude',
        providerType: 'anthropic',
        baseUrl: undefined,
        model: 'claude-sonnet-4-5',
        plainApiKey: undefined,
      })
    })
  })

  it('deletes a provider', async () => {
    const provider = createMockAiProviderConfig()
    mockAiChat([provider])
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(mockDeleteProvider).toHaveBeenCalledWith(provider.id)
  })

  it('sets a non-default provider as default', async () => {
    const provider = createMockAiProviderConfig({ isDefault: false })
    mockAiChat([provider])
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Set default' }))
    expect(mockSetDefaultProvider).toHaveBeenCalledWith(provider.id)
  })

  it('tests the connection with the current form values and shows the result', async () => {
    render(<AiProviderSettings onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: '+ New Provider' }))
    await userEvent.type(screen.getByPlaceholderText('claude-sonnet-4-5'), 'claude-sonnet-4-5')
    await userEvent.type(screen.getByPlaceholderText('sk-…'), 'sk-ant-test')
    await userEvent.click(screen.getByRole('button', { name: /Test Connection/i }))

    await waitFor(() => {
      expect(mockTestProvider).toHaveBeenCalledWith({
        providerType: 'anthropic',
        baseUrl: undefined,
        model: 'claude-sonnet-4-5',
        plainApiKey: 'sk-ant-test',
      })
      expect(screen.getByText('✓ Connection successful')).toBeInTheDocument()
    })
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<AiProviderSettings onClose={onClose} />)
    await userEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})
