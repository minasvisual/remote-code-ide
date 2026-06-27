import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UnsavedChangesDialog } from '../UnsavedChangesDialog'

describe('UnsavedChangesDialog', () => {
  it('renders the filename in the message', () => {
    render(
      <UnsavedChangesDialog filename="index.ts" onSave={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('renders all three action buttons', () => {
    render(
      <UnsavedChangesDialog filename="app.ts" onSave={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Save & Close' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls onSave when Save & Close is clicked', async () => {
    const onSave = vi.fn()
    render(
      <UnsavedChangesDialog filename="app.ts" onSave={onSave} onDiscard={vi.fn()} onCancel={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save & Close' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('calls onDiscard when Discard is clicked', async () => {
    const onDiscard = vi.fn()
    render(
      <UnsavedChangesDialog filename="app.ts" onSave={vi.fn()} onDiscard={onDiscard} onCancel={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onDiscard).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <UnsavedChangesDialog filename="app.ts" onSave={vi.fn()} onDiscard={vi.fn()} onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when modal close button is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <UnsavedChangesDialog filename="app.ts" onSave={vi.fn()} onDiscard={vi.fn()} onCancel={onCancel} />
    )
    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
