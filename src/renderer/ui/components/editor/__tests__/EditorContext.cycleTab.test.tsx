import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditorProvider, useEditor } from '../../../../application/contexts/EditorContext'
import { AppProvider } from '../../../../application/contexts/AppContext'
import { createMockApi } from '../../../../__tests__/helpers/mockApi'
import type { FileNode } from '../../../../domain/entities/FileNode'
import type { ReactNode } from 'react'

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
  const api = createMockApi()
  api.sftp.readFile = vi.fn().mockResolvedValue({ content: 'hello', localTempPath: '/tmp/f' })
  vi.stubGlobal('api', api)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EditorContext — cycleTab', () => {
  it('does nothing when fewer than 2 tabs are open', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper })

    await act(async () => {
      await result.current.openFile(makeFileNode('a'), 'sess-1')
    })

    const before = result.current.activeTabId

    act(() => result.current.cycleTab(1))
    expect(result.current.activeTabId).toBe(before)

    act(() => result.current.cycleTab(-1))
    expect(result.current.activeTabId).toBe(before)
  })

  it('cycles forward wrapping around', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper })

    await act(async () => {
      await result.current.openFile(makeFileNode('a'), 'sess-1')
      await result.current.openFile(makeFileNode('b'), 'sess-1')
      await result.current.openFile(makeFileNode('c'), 'sess-1')
    })

    const ids = result.current.tabs.map((t) => t.id)
    const last = ids[ids.length - 1]
    act(() => result.current.setActiveTab(last))

    act(() => result.current.cycleTab(1))
    expect(result.current.activeTabId).toBe(ids[0])
  })

  it('cycles backward wrapping around', async () => {
    const { result } = renderHook(() => useEditor(), { wrapper })

    await act(async () => {
      await result.current.openFile(makeFileNode('x'), 'sess-1')
      await result.current.openFile(makeFileNode('y'), 'sess-1')
    })

    const ids = result.current.tabs.map((t) => t.id)
    act(() => result.current.setActiveTab(ids[0]))

    act(() => result.current.cycleTab(-1))
    expect(result.current.activeTabId).toBe(ids[ids.length - 1])
  })
})
