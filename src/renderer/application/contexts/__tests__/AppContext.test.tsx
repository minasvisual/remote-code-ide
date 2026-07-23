import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppProvider, useApp } from '../AppContext'
import { createMockApi } from '../../../__tests__/helpers/mockApi'
import type { ReactNode } from 'react'
import type { IRemoteApi } from '../../../domain/ports/IRemoteApi'
import type { UploadProgressEvent } from '../../../domain/ports/IRemoteApi'

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

describe('AppContext — startUpload / dismissUpload', () => {
  it('does nothing when the native upload dialog is cancelled (null paths)', async () => {
    mockApi.sftp.openUploadDialog.mockResolvedValue(null)
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => {
      await result.current.startUpload('sess-1', '/var/www', 'files')
    })

    expect(result.current.uploadBatches).toHaveLength(0)
    expect(mockApi.sftp.uploadFiles).not.toHaveBeenCalled()
  })

  it('opens the native dialog, creates a batch, and calls uploadFiles with the selected paths', async () => {
    mockApi.sftp.openUploadDialog.mockResolvedValue(['/local/a.txt'])
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => {
      await result.current.startUpload('sess-1', '/var/www', 'files')
    })

    expect(result.current.uploadBatches).toHaveLength(1)
    expect(result.current.uploadBatches[0].targetDir).toBe('/var/www')
    expect(result.current.uploadBatches[0].entries).toEqual([])
    expect(mockApi.sftp.uploadFiles).toHaveBeenCalledWith('sess-1', '/var/www', ['/local/a.txt'])
  })

  it('routes progress events to the entries of the batch that owns the local path', async () => {
    let progressCallback: (event: UploadProgressEvent) => void = () => {}
    mockApi.sftp.onUploadProgress.mockImplementation((cb: (event: UploadProgressEvent) => void) => {
      progressCallback = cb
      return () => {}
    })
    mockApi.sftp.openUploadDialog.mockResolvedValue(['/local/a.txt'])
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => {
      await result.current.startUpload('sess-1', '/var/www', 'files')
    })
    act(() => {
      progressCallback({ localPath: '/local/a.txt', remoteName: 'a.txt', status: 'uploading' })
    })

    expect(result.current.uploadBatches[0].entries).toEqual([
      { remoteName: 'a.txt', status: 'uploading', error: undefined },
    ])
  })

  it('supports multiple concurrent batches, routing each progress event only to its own batch', async () => {
    let progressCallback: (event: UploadProgressEvent) => void = () => {}
    mockApi.sftp.onUploadProgress.mockImplementation((cb: (event: UploadProgressEvent) => void) => {
      progressCallback = cb
      return () => {}
    })
    mockApi.sftp.openUploadDialog
      .mockResolvedValueOnce(['/local/folderA'])
      .mockResolvedValueOnce(['/local/folderB'])
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => { await result.current.startUpload('sess-1', '/remote/a', 'folder') })
    await act(async () => { await result.current.startUpload('sess-1', '/remote/b', 'folder') })

    expect(result.current.uploadBatches).toHaveLength(2)
    const [batchA, batchB] = result.current.uploadBatches

    act(() => {
      progressCallback({ localPath: '/local/folderA/index.ts', remoteName: 'folderA/index.ts', status: 'done' })
      progressCallback({ localPath: '/local/folderB/index.ts', remoteName: 'folderB/index.ts', status: 'uploading' })
    })

    expect(result.current.uploadBatches.find((b) => b.id === batchA.id)!.entries).toEqual([
      { remoteName: 'folderA/index.ts', status: 'done', error: undefined },
    ])
    expect(result.current.uploadBatches.find((b) => b.id === batchB.id)!.entries).toEqual([
      { remoteName: 'folderB/index.ts', status: 'uploading', error: undefined },
    ])
  })

  it('sets uploadRefreshSignal to the batch targetDir only once all its entries settle', async () => {
    let progressCallback: (event: UploadProgressEvent) => void = () => {}
    mockApi.sftp.onUploadProgress.mockImplementation((cb: (event: UploadProgressEvent) => void) => {
      progressCallback = cb
      return () => {}
    })
    mockApi.sftp.openUploadDialog.mockResolvedValue(['/local/a.txt', '/local/b.txt'])
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => { await result.current.startUpload('sess-1', '/var/www', 'files') })

    act(() => { progressCallback({ localPath: '/local/a.txt', remoteName: 'a.txt', status: 'pending' }) })
    act(() => { progressCallback({ localPath: '/local/b.txt', remoteName: 'b.txt', status: 'pending' }) })
    expect(result.current.uploadRefreshSignal).toBeNull()

    act(() => { progressCallback({ localPath: '/local/a.txt', remoteName: 'a.txt', status: 'done' }) })
    expect(result.current.uploadRefreshSignal).toBeNull()

    act(() => {
      progressCallback({ localPath: '/local/b.txt', remoteName: 'b.txt', status: 'error', error: 'boom' })
    })
    expect(result.current.uploadRefreshSignal).toMatchObject({ path: '/var/www' })
  })

  it('dismissUpload is a no-op while the batch has pending/uploading entries, but removes it once settled', async () => {
    let progressCallback: (event: UploadProgressEvent) => void = () => {}
    mockApi.sftp.onUploadProgress.mockImplementation((cb: (event: UploadProgressEvent) => void) => {
      progressCallback = cb
      return () => {}
    })
    mockApi.sftp.openUploadDialog.mockResolvedValue(['/local/a.txt'])
    const { result } = renderHook(() => useApp(), { wrapper })

    await act(async () => { await result.current.startUpload('sess-1', '/var/www', 'files') })
    const batchId = result.current.uploadBatches[0].id

    act(() => { progressCallback({ localPath: '/local/a.txt', remoteName: 'a.txt', status: 'uploading' }) })
    act(() => { result.current.dismissUpload(batchId) })
    expect(result.current.uploadBatches).toHaveLength(1)

    act(() => { progressCallback({ localPath: '/local/a.txt', remoteName: 'a.txt', status: 'done' }) })
    act(() => { result.current.dismissUpload(batchId) })
    expect(result.current.uploadBatches).toHaveLength(0)
  })
})
