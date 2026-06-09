import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DeleteConnectionModal } from '../DeleteConnectionModal'
import { createMockApi, createMockConnection } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

beforeEach(() => {
  vi.stubGlobal('api', createMockApi())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DeleteConnectionModal', () => {
  const conn = createMockConnection({ label: 'Prod Server' })

  it('renders the connection label', () => {
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Prod Server')).toBeInTheDocument()
  })

  it('Delete button is disabled when field is empty', () => {
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()
  })

  it('Delete button is disabled with wrong text', async () => {
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    await userEvent.type(screen.getByPlaceholderText('excluir'), 'delete')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('Delete button is enabled when user types "excluir"', async () => {
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    await userEvent.type(screen.getByPlaceholderText('excluir'), 'excluir')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('Delete button is enabled case-insensitively (EXCLUIR)', async () => {
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={vi.fn()} />
    )
    await userEvent.type(screen.getByPlaceholderText('excluir'), 'EXCLUIR')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('calls onConfirm when Delete button is clicked after typing excluir', async () => {
    const onConfirm = vi.fn()
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={onConfirm} onClose={vi.fn()} />
    )
    await userEvent.type(screen.getByPlaceholderText('excluir'), 'excluir')
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <DeleteConnectionModal connection={conn} onConfirm={vi.fn()} onClose={onClose} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
