import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('renders title and children', () => {
    render(
      <Modal title="My Modal" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    )
    expect(screen.getByText('My Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('calls onClose when ✕ button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    )
    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders footer when provided', () => {
    render(
      <Modal title="Test" onClose={vi.fn()} footer={<button>Confirm</button>}>
        <p>Content</p>
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('does not render footer section when footer is not provided', () => {
    const { container } = render(
      <Modal title="Test" onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    )
    expect(container.querySelector('.justify-end')).not.toBeInTheDocument()
  })
})
