import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { AppProvider } from '../../application/contexts/AppContext'
import { EditorProvider } from '../../application/contexts/EditorContext'

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <AppProvider>
        <EditorProvider>{children}</EditorProvider>
      </AppProvider>
    )
  }
  return render(ui, { wrapper: Wrapper as any, ...options })
}
