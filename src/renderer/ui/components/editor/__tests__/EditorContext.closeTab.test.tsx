import { renderHook, act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditorProvider, useEditor } from '../../../../application/contexts/EditorContext'
import { AppProvider } from '../../../../application/contexts/AppContext'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import type { FileNode } from '../../../../domain/entities/FileNode'
import type { ReactNode } from 'react'
import type { IRemoteApi } from '../../../../domain/ports/IRemoteApi'
import { render } from '@testing-library/react'

let mockApi: IRemoteApi

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider><EditorProvider>{children}</EditorProvider></AppProvider>
}

function makeFileNode(id: string): FileNode {
  return {
    name: `file-${id}.ts`,
    path: `/file-${id}.ts`,
    type: 'file',
    size: 0,
    modifiedAt: '',
    permissions: '-rw-r--r--',
    isLoaded: false,
  }
}

beforeEach(() => {
  mockApi = createMockApi()
  mockApi.sftp.readFile = vi.fn().mockResolvedValue({ content: 'hello', localTempPath: '/tmp/f' })
  vi.stubGlobal('api', mockApi)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditorContext — closeTab', () => {
  it('closes a clean tab immediately', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper })

    await act(async () => {
      await result.current.openFile(makeFileNode('a'), 'sess-1')
    })
    expect(result.current.tabs).toHaveLength(1)

    await act(async () => {
      const action = await result.current.closeTab(result.current.tabs[0].id)
      expect(action).toBe('closed')
    })
    expect(result.current.tabs).toHaveLength(0)
  })

  it('shows dialog for dirty tab and discard closes the tab', async () => {
    function TestComponent() {
      const editor = useEditor()
      return (
        <div>
          <span data-testid="count">{editor.tabs.length}</span>
          <button onClick={async () => {
            await editor.openFile(makeFileNode('a'), 'sess-1')
          }}>open</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.updateContent(editor.tabs[0].id, 'changed')
          }}>dirty</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.closeTab(editor.tabs[0].id)
          }}>close</button>
        </div>
      )
    }

    render(
      <AppProvider><EditorProvider><TestComponent /></EditorProvider></AppProvider>
    )

    await userEvent.click(screen.getByText('open'))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    await userEvent.click(screen.getByText('dirty'))
    await userEvent.click(screen.getByText('close'))

    await vi.waitFor(() => expect(screen.getByText('Unsaved Changes')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
  })

  it('shows dialog for dirty tab and cancel keeps the tab open', async () => {
    function TestComponent() {
      const editor = useEditor()
      return (
        <div>
          <span data-testid="count">{editor.tabs.length}</span>
          <button onClick={async () => {
            await editor.openFile(makeFileNode('a'), 'sess-1')
          }}>open</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.updateContent(editor.tabs[0].id, 'changed')
          }}>dirty</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.closeTab(editor.tabs[0].id)
          }}>close</button>
        </div>
      )
    }

    render(
      <AppProvider><EditorProvider><TestComponent /></EditorProvider></AppProvider>
    )

    await userEvent.click(screen.getByText('open'))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    await userEvent.click(screen.getByText('dirty'))
    await userEvent.click(screen.getByText('close'))

    await vi.waitFor(() => expect(screen.getByText('Unsaved Changes')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await vi.waitFor(() => expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument())
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('shows dialog for dirty tab and save calls writeFile then closes', async () => {
    function TestComponent() {
      const editor = useEditor()
      return (
        <div>
          <span data-testid="count">{editor.tabs.length}</span>
          <button onClick={async () => {
            await editor.openFile(makeFileNode('a'), 'sess-1')
          }}>open</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.updateContent(editor.tabs[0].id, 'changed')
          }}>dirty</button>
          <button onClick={() => {
            if (editor.tabs[0]) editor.closeTab(editor.tabs[0].id)
          }}>close</button>
        </div>
      )
    }

    render(
      <AppProvider><EditorProvider><TestComponent /></EditorProvider></AppProvider>
    )

    await userEvent.click(screen.getByText('open'))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    await userEvent.click(screen.getByText('dirty'))
    await userEvent.click(screen.getByText('close'))

    await vi.waitFor(() => expect(screen.getByText('Unsaved Changes')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Save & Close' }))
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))
    expect(mockApi.sftp.writeFile).toHaveBeenCalled()
  })
})
