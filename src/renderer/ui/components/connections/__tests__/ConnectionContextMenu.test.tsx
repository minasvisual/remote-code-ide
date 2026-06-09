import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionContextMenu } from '../ConnectionContextMenu'
import { createMockApi, createMockConnection } from '../../../../__tests__/helpers/mockApi'
import { renderWithProviders } from '../../../../__tests__/helpers/renderWithProviders'

beforeEach(() => {
  vi.stubGlobal('api', createMockApi())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const conn = createMockConnection({ label: 'Test Server' })

describe('ConnectionContextMenu', () => {
  it('renders Edit and Delete options', () => {
    renderWithProviders(
      <ConnectionContextMenu x={100} y={100} connection={conn} onEdit={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onEdit and onClose when Edit is clicked', async () => {
    const onEdit = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <ConnectionContextMenu x={100} y={100} connection={conn} onEdit={onEdit} onDelete={vi.fn()} onClose={onClose} />
    )
    await userEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onDelete and onClose when Delete is clicked', async () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <ConnectionContextMenu x={100} y={100} connection={conn} onEdit={vi.fn()} onDelete={onDelete} onClose={onClose} />
    )
    await userEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ConnectionContextMenu x={100} y={100} connection={conn} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} />
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when clicking outside the menu', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ConnectionContextMenu x={100} y={100} connection={conn} onEdit={vi.fn()} onDelete={vi.fn()} onClose={onClose} />
    )
    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalled()
  })
})
