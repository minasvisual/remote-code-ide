import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input', () => {
  it('renders the label when provided', () => {
    render(<Input label="Host" />)
    expect(screen.getByText('Host')).toBeInTheDocument()
  })

  it('renders without label', () => {
    render(<Input placeholder="Enter value" />)
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })

  it('calls onChange with new value on typing', async () => {
    const onChange = vi.fn()
    render(<Input value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'localhost')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows error message when error prop is set', () => {
    render(<Input error="Field is required" />)
    expect(screen.getByText('Field is required')).toBeInTheDocument()
  })

  it('adds red border class when error is set', () => {
    render(<Input error="Required" />)
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500')
  })
})
