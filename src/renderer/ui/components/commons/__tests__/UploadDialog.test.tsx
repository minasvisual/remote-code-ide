import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UploadDialog } from '../UploadDialog'
import type { UploadEntry } from '../UploadDialog'

function makeEntries(statuses: UploadEntry['status'][]): UploadEntry[] {
  return statuses.map((status, i) => ({ remoteName: `file-${i}.txt`, status }))
}

describe('UploadDialog — Close button', () => {
  it('is disabled when any entry is pending', () => {
    const entries = makeEntries(['pending', 'done'])
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })

  it('is disabled when any entry is uploading', () => {
    const entries = makeEntries(['done', 'uploading'])
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })

  it('is enabled when all entries are done', async () => {
    const entries = makeEntries(['done', 'done'])
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeDisabled()
  })

  it('is enabled when all entries are error', () => {
    const entries = makeEntries(['error', 'error'])
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeDisabled()
  })

  it('is enabled when entries are a mix of done and error', () => {
    const entries = makeEntries(['done', 'error', 'done'])
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeDisabled()
  })

  it('calls onClose when Close button is clicked and all done', async () => {
    const onClose = vi.fn()
    const entries = makeEntries(['done'])
    render(<UploadDialog entries={entries} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when Close button is disabled (uploading)', async () => {
    const onClose = vi.fn()
    const entries = makeEntries(['uploading'])
    render(<UploadDialog entries={entries} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('UploadDialog — entry display', () => {
  it('shows "Preparing upload…" when entries is empty', () => {
    render(<UploadDialog entries={[]} onClose={vi.fn()} />)
    expect(screen.getByText('Preparing upload…')).toBeInTheDocument()
  })

  it('renders all entry remote names', () => {
    const entries: UploadEntry[] = [
      { remoteName: 'src/index.ts', status: 'done' },
      { remoteName: 'src/utils.ts', status: 'error', error: 'Permission denied' },
    ]
    render(<UploadDialog entries={entries} onClose={vi.fn()} />)
    expect(screen.getByText('src/index.ts')).toBeInTheDocument()
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument()
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
  })
})
