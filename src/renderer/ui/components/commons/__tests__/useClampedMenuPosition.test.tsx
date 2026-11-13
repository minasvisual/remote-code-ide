import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useClampedMenuPosition } from '../useClampedMenuPosition'

function TestMenu({ x, y }: { x: number; y: number }) {
  const { ref, style } = useClampedMenuPosition(x, y)
  return (
    <div ref={ref} data-testid="menu" style={style}>
      content
    </div>
  )
}

function mockMenuSize(width: number, height: number) {
  vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => {},
  })
}

describe('useClampedMenuPosition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps the requested position when it already fits in the viewport', () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
    mockMenuSize(140, 72)
    render(<TestMenu x={100} y={100} />)
    const menu = screen.getByTestId('menu')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe('100px')
  })

  it('clamps left when the click is near the right edge', () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
    mockMenuSize(140, 72)
    render(<TestMenu x={1000} y={100} />)
    const menu = screen.getByTestId('menu')
    expect(menu.style.left).toBe(`${1024 - 140 - 4}px`)
    expect(menu.style.top).toBe('100px')
  })

  it('clamps top when the click is near the bottom edge', () => {
    vi.stubGlobal('innerWidth', 1024)
    vi.stubGlobal('innerHeight', 768)
    mockMenuSize(140, 200)
    render(<TestMenu x={100} y={760} />)
    const menu = screen.getByTestId('menu')
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe(`${768 - 200 - 4}px`)
  })
})
