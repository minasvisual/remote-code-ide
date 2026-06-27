import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionForm } from '../ConnectionForm'
import { createMockConnection } from '../../../../__tests__/helpers/mockApi'

vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../application/contexts/AppContext')>()
  return { ...original, useApp: vi.fn() }
})

import { useApp } from '../../../../application/contexts/AppContext'

const mockNotify = vi.fn()
const mockSaveConnection = vi.fn()
const mockUpdateConnection = vi.fn()
const mockTestConnection = vi.fn()

function baseUseApp() {
  return {
    connections: [],
    activeSession: null,
    notifications: [],
    isConnecting: false,
    loadConnections: vi.fn(),
    saveConnection: mockSaveConnection,
    updateConnection: mockUpdateConnection,
    deleteConnection: vi.fn(),
    testConnection: mockTestConnection,
    connect: vi.fn(),
    disconnect: vi.fn(),
    notify: mockNotify,
    dismissNotification: vi.fn(),
    openTerminalAt: vi.fn(),
    terminalTargetDir: null,
    registerBeforeDisconnect: vi.fn(),
  }
}

beforeEach(() => {
  vi.mocked(useApp).mockReturnValue(baseUseApp())
  mockSaveConnection.mockResolvedValue(createMockConnection())
  mockUpdateConnection.mockResolvedValue(createMockConnection())
  mockTestConnection.mockResolvedValue({ success: true, message: 'Connected' })
})

afterEach(() => {
  vi.restoreAllMocks()
  mockNotify.mockReset()
  mockSaveConnection.mockReset()
  mockUpdateConnection.mockReset()
  mockTestConnection.mockReset()
})

describe('ConnectionForm', () => {
  it('renders all required fields', () => {
    render(<ConnectionForm onClose={vi.fn()} />)
    expect(screen.getByText('New Connection')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('My Server')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('192.168.1.1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('root')).toBeInTheDocument()
  })

  it('calls notify with error when required fields are empty on save', async () => {
    render(<ConnectionForm onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', 'Label, host and username are required')
    })
  })

  it('calls saveConnection and onClose when valid fields are submitted', async () => {
    const onClose = vi.fn()
    render(<ConnectionForm onClose={onClose} />)

    await userEvent.type(screen.getByPlaceholderText('My Server'), 'My Server')
    await userEvent.type(screen.getByPlaceholderText('192.168.1.1'), '192.168.1.1')
    await userEvent.type(screen.getByPlaceholderText('root'), 'root')
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))

    await waitFor(() => {
      expect(mockSaveConnection).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'My Server', host: '192.168.1.1', username: 'root' })
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<ConnectionForm onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders Edit Connection title and pre-filled fields in edit mode', () => {
    const conn = createMockConnection({ label: 'My Server', host: '10.0.0.1', username: 'admin', port: 22 })
    render(<ConnectionForm connection={conn} onClose={vi.fn()} />)
    expect(screen.getByText('Edit Connection')).toBeInTheDocument()
    expect(screen.getByDisplayValue('My Server')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10.0.0.1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('admin')).toBeInTheDocument()
  })

  it('credential fields start blank with placeholder in edit mode', () => {
    const conn = createMockConnection()
    render(<ConnectionForm connection={conn} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('Leave blank to keep current')).toBeInTheDocument()
  })

  it('calls updateConnection (not saveConnection) in edit mode', async () => {
    const conn = createMockConnection({ label: 'My Server', host: '10.0.0.1', username: 'admin' })
    const onClose = vi.fn()
    render(<ConnectionForm connection={conn} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /Save/i }))
    await waitFor(() => {
      expect(mockUpdateConnection).toHaveBeenCalled()
      expect(mockSaveConnection).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('switches to private key auth when radio is selected', async () => {
    const { container } = render(<ConnectionForm onClose={vi.fn()} />)
    // password input is present initially
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Private Key' }))

    // Private Key textarea appears
    expect(screen.getByText('Private Key (PEM content)')).toBeInTheDocument()
    // Password input disappears
    expect(container.querySelector('input[type="password"]')).not.toBeInTheDocument()
  })
})
