import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppProvider, useApp } from '../AppContext'
import { createMockApi } from '../../../__tests__/helpers/mockApi'
import type { ReactNode } from 'react'
import type { IRemoteApi } from '../../../domain/ports/IRemoteApi'

let mockApi: IRemoteApi

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}

beforeEach(() => {
  mockApi = createMockApi()
  vi.stubGlobal('api', mockApi)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AppContext — notify / updateNotification', () => {
  it('notify() returns the created id and auto-dismisses after 4s', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    let id = ''
    act(() => {
      id = result.current.notify('info', 'hello')
    })
    expect(id).toBeTruthy()
    expect(result.current.notifications).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.notifications).toHaveLength(0)
  })

  it('updateNotification patches fields on the matching notification in place', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    let id = ''
    act(() => { id = result.current.notify('info', 'Downloading x...') })
    act(() => { result.current.updateNotification(id, { progress: 42, status: 'downloading' }) })

    expect(result.current.notifications[0]).toMatchObject({ progress: 42, status: 'downloading' })
  })

  it('skips the 4s auto-dismiss timer while status is downloading', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    let id = ''
    act(() => { id = result.current.notify('info', 'Downloading x...') })
    act(() => { result.current.updateNotification(id, { progress: 10, status: 'downloading' }) })

    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.notifications).toHaveLength(1)
  })

  it('resumes the auto-dismiss timer once a terminal status patch arrives', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    let id = ''
    act(() => { id = result.current.notify('info', 'Downloading x...') })
    act(() => { result.current.updateNotification(id, { progress: 10, status: 'downloading' }) })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.notifications).toHaveLength(1)

    act(() => {
      result.current.updateNotification(id, {
        type: 'success', status: 'done', progress: undefined, message: 'Done'
      })
    })
    expect(result.current.notifications).toHaveLength(1)

    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.notifications).toHaveLength(0)
  })

  it('dismissNotification clears a pending auto-dismiss timer without a double removal error', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    let id = ''
    act(() => { id = result.current.notify('info', 'hello') })
    act(() => { result.current.dismissNotification(id) })
    expect(result.current.notifications).toHaveLength(0)

    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.notifications).toHaveLength(0)
  })
})
