import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionManager } from '../ConnectionManager'
import { createMockApi, createMockConnection } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

let mockApi: ReturnType<typeof createMockApi>

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ConnectionManager', () => {
  it('shows empty state message when no connections', async () => {
    mockApi.connections.list.mockResolvedValue([])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => {
      expect(screen.getByText('No connections yet.')).toBeInTheDocument()
    })
  })

  it('lists connections returned from API', async () => {
    const conn = createMockConnection({ label: 'Prod Server', host: '10.0.0.1' })
    mockApi.connections.list.mockResolvedValue([conn])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => {
      expect(screen.getByText('Prod Server')).toBeInTheDocument()
      expect(screen.getByText('root@10.0.0.1:22')).toBeInTheDocument()
    })
  })

  it('opens ConnectionForm when + button is clicked', async () => {
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => {
      expect(screen.getByTitle('New connection')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTitle('New connection'))
    await waitFor(() => {
      expect(screen.getByText('New Connection')).toBeInTheDocument()
    })
  })

  it('opens ConnectionForm from Add Connection button in empty state', async () => {
    mockApi.connections.list.mockResolvedValue([])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Connection' })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Add Connection' }))
    await waitFor(() => {
      expect(screen.getByText('New Connection')).toBeInTheDocument()
    })
  })

  it('opens context menu on right-click of a connection', async () => {
    const conn = createMockConnection({ label: 'My Server' })
    mockApi.connections.list.mockResolvedValue([conn])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getByText('My Server')).toBeInTheDocument())
    await userEvent.pointer({ target: screen.getByText('My Server'), keys: '[MouseRight]' })
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('opens delete confirmation modal from context menu', async () => {
    const conn = createMockConnection({ id: 'conn-abc', label: 'My Server' })
    mockApi.connections.list.mockResolvedValue([conn])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getByText('My Server')).toBeInTheDocument())
    await userEvent.pointer({ target: screen.getByText('My Server'), keys: '[MouseRight]' })
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect(screen.getByText('Delete Connection')).toBeInTheDocument())
  })

  it('shows all Connect buttons enabled when no session is active', async () => {
    const conn1 = createMockConnection({ id: 'c1', label: 'Server A' })
    const conn2 = createMockConnection({ id: 'c2', label: 'Server B' })
    mockApi.connections.list.mockResolvedValue([conn1, conn2])
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getByText('Server A')).toBeInTheDocument())
    const buttons = screen.getAllByRole('button', { name: 'Connect' })
    expect(buttons).toHaveLength(2)
    buttons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it('changes button to Disconnect on the active connection after connect', async () => {
    const conn = createMockConnection({ id: 'c1', label: 'My Server' })
    mockApi.connections.list.mockResolvedValue([conn])
    mockApi.ssh.connect.mockResolvedValue({ success: true, sessionId: 'sess-1' })
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument())
  })

  it('disables Connect buttons on other connections when one is active', async () => {
    const conn1 = createMockConnection({ id: 'c1', label: 'Server A' })
    const conn2 = createMockConnection({ id: 'c2', label: 'Server B' })
    mockApi.connections.list.mockResolvedValue([conn1, conn2])
    mockApi.ssh.connect.mockResolvedValue({ success: true, sessionId: 'sess-1' })
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Connect' })).toHaveLength(2))
    await userEvent.click(screen.getAllByRole('button', { name: 'Connect' })[0])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled()
  })

  it('calls disconnect when Disconnect button is clicked', async () => {
    const conn = createMockConnection({ id: 'c1', label: 'My Server' })
    mockApi.connections.list.mockResolvedValue([conn])
    mockApi.ssh.connect.mockResolvedValue({ success: true, sessionId: 'sess-1' })
    mockApi.ssh.disconnect.mockResolvedValue(undefined)
    renderWithProviders(<ConnectionManager />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(mockApi.ssh.disconnect).toHaveBeenCalledWith('sess-1'))
  })
})
