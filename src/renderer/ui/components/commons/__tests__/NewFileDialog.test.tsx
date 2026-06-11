import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { NewFileDialog } from '../NewFileDialog'

function renderDialog(props: Partial<React.ComponentProps<typeof NewFileDialog>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <NewFileDialog
      targetDir="/home/user"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  )
  return { onConfirm, onCancel }
}

describe('NewFileDialog', () => {
  it('renders with title and empty input', () => {
    renderDialog()
    expect(screen.getByText('New File')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('filename.ext')).toHaveValue('')
  })

  it('shows target directory', () => {
    renderDialog({ targetDir: '/var/www' })
    expect(screen.getByText('/var/www/')).toBeInTheDocument()
  })

  it('shows / as target dir for root', () => {
    renderDialog({ targetDir: '/' })
    expect(screen.getByText('/')).toBeInTheDocument()
  })

  it('calls onConfirm with trimmed filename on Create click', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.type(screen.getByPlaceholderText('filename.ext'), '  app.ts  ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onConfirm).toHaveBeenCalledWith('app.ts')
  })

  it('calls onConfirm on Enter key', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.type(screen.getByPlaceholderText('filename.ext'), 'index.ts')
    await userEvent.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledWith('index.ts')
  })

  it('calls onCancel on Cancel click', async () => {
    const { onCancel } = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel on Escape key', async () => {
    const { onCancel } = renderDialog()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('rejects empty filename and shows validation error', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Filename cannot be empty')).toBeInTheDocument()
  })

  it('rejects whitespace-only filename', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.type(screen.getByPlaceholderText('filename.ext'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Filename cannot be empty')).toBeInTheDocument()
  })

  it('rejects filename containing slash', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.type(screen.getByPlaceholderText('filename.ext'), 'sub/file.ts')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Filename cannot contain "/"')).toBeInTheDocument()
  })

  it('renders parent-supplied FILE_EXISTS error inline without dismissing', () => {
    const { onConfirm } = renderDialog({ error: 'A file named "app.ts" already exists' })
    expect(screen.getByText('A file named "app.ts" already exists')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('clears validation error when user starts typing', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Filename cannot be empty')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('filename.ext'), 'a')
    expect(screen.queryByText('Filename cannot be empty')).not.toBeInTheDocument()
  })
})
