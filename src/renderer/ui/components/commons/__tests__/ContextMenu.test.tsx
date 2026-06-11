import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ContextMenu } from '../ContextMenu'

const items = [
  { label: 'Rename', onClick: vi.fn() },
  { label: 'Delete', onClick: vi.fn() },
]

describe('ContextMenu', () => {
  it('renders all items', () => {
    render(<ContextMenu items={items} position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls item onClick and onClose when an item is clicked', async () => {
    const onClose = vi.fn()
    const renameClick = vi.fn()
    render(
      <ContextMenu
        items={[{ label: 'Rename', onClick: renameClick }]}
        position={{ x: 0, y: 0 }}
        onClose={onClose}
      />
    )
    await userEvent.click(screen.getByText('Rename'))
    expect(renameClick).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(<ContextMenu items={items} position={{ x: 0, y: 0 }} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking outside the menu', async () => {
    const onClose = vi.fn()
    render(
      <div>
        <ContextMenu items={items} position={{ x: 0, y: 0 }} onClose={onClose} />
        <button>Outside</button>
      </div>
    )
    await userEvent.click(screen.getByText('Outside'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
