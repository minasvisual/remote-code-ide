import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WelcomeScreen } from '../WelcomeScreen'

describe('WelcomeScreen', () => {
  it('renders app name', () => {
    render(<WelcomeScreen />)
    expect(screen.getByText('MyCODEany')).toBeInTheDocument()
  })

  it('renders instructional message', () => {
    render(<WelcomeScreen />)
    expect(screen.getByText(/Connect to a server and open a file/i)).toBeInTheDocument()
  })
})
