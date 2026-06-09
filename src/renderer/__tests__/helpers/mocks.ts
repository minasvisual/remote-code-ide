import { vi } from 'vitest'

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => {
    const { createElement } = require('react')
    return createElement('textarea', {
      'data-testid': 'monaco-editor',
      value: value ?? '',
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
    })
  },
  loader: { config: vi.fn() },
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    resize: vi.fn(),
    rows: 24,
    cols: 80,
  })),
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    fit: vi.fn(),
    dispose: vi.fn(),
  })),
}))
