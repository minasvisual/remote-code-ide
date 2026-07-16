import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ISftpService, SearchOptions, SearchFileMatch } from '../../../domain/ports/ISftpService'
import type { TempFileManager } from '../../../adapters/temp/TempFileManager'
import type { DownloadTransferRegistry } from '../../../adapters/temp/DownloadTransferRegistry'
import { SearchTransferRegistry } from '../../../adapters/temp/SearchTransferRegistry'

const handlers = new Map<string, (...args: unknown[]) => unknown>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => { handlers.set(channel, fn) }
  },
  dialog: {},
  BrowserWindow: { fromWebContents: () => null, getFocusedWindow: () => null }
}))

vi.mock('uuid', () => {
  let counter = 0
  return { v4: () => `search-${++counter}` }
})

import { registerSftpIpc } from '../sftp.ipc'

interface ControllableSearch {
  searchInFolder: ReturnType<typeof vi.fn>
  triggerMatch: (result: SearchFileMatch) => void
  resolve: () => void
  reject: (err: unknown) => void
}

function makeControllableSearch(): ControllableSearch {
  let resolveFn!: () => void
  let rejectFn!: (err: unknown) => void
  let onMatchCb: ((result: SearchFileMatch) => void) | undefined
  const promise = new Promise<void>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  const searchInFolder = vi.fn(
    (_sessionId: string, _rootPath: string, _query: string, options: SearchOptions) => {
      onMatchCb = options.onMatch
      return promise
    }
  )
  return {
    searchInFolder,
    triggerMatch: (result) => onMatchCb?.(result),
    resolve: () => resolveFn(),
    reject: (err) => rejectFn(err)
  }
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('sftp.ipc — search handlers', () => {
  let sentEvents: Array<{ channel: string; payload: unknown }>
  let fakeEvent: { sender: { send: (channel: string, payload: unknown) => void } }

  beforeEach(() => {
    handlers.clear()
    sentEvents = []
    fakeEvent = {
      sender: { send: (channel, payload) => { sentEvents.push({ channel, payload }) } }
    }
  })

  it('returns { searchId } immediately without awaiting completion', () => {
    const search = makeControllableSearch()
    const sftp = { searchInFolder: search.searchInFolder } as unknown as ISftpService
    registerSftpIpc(sftp, {} as TempFileManager, {} as DownloadTransferRegistry, new SearchTransferRegistry())

    const handler = handlers.get('sftp:searchInFolder')!
    const result = handler(fakeEvent, 'sess-1', '/proj', 'term')

    expect(result).toEqual({ searchId: 'search-1' })
    expect(sentEvents).toHaveLength(0)
  })

  it('emits a match event then a done event on successful completion', async () => {
    const search = makeControllableSearch()
    const sftp = { searchInFolder: search.searchInFolder } as unknown as ISftpService
    registerSftpIpc(sftp, {} as TempFileManager, {} as DownloadTransferRegistry, new SearchTransferRegistry())

    const handler = handlers.get('sftp:searchInFolder')!
    const { searchId } = handler(fakeEvent, 'sess-1', '/proj', 'term') as { searchId: string }

    const match: SearchFileMatch = { path: '/proj/a.txt', name: 'a.txt', totalMatches: 1, matches: [{ line: 1, text: 'term' }] }
    search.triggerMatch(match)
    expect(sentEvents).toContainEqual({
      channel: 'sftp:searchProgress',
      payload: { searchId, type: 'match', result: match }
    })

    search.resolve()
    await flushMicrotasks()

    expect(sentEvents).toContainEqual({
      channel: 'sftp:searchProgress',
      payload: { searchId, type: 'done' }
    })
  })

  it('emits a cancelled event when the search rejects with code CANCELLED', async () => {
    const search = makeControllableSearch()
    const sftp = { searchInFolder: search.searchInFolder } as unknown as ISftpService
    registerSftpIpc(sftp, {} as TempFileManager, {} as DownloadTransferRegistry, new SearchTransferRegistry())

    const handler = handlers.get('sftp:searchInFolder')!
    const { searchId } = handler(fakeEvent, 'sess-1', '/proj', 'term') as { searchId: string }

    search.reject(Object.assign(new Error('Search cancelled'), { code: 'CANCELLED' }))
    await flushMicrotasks()

    expect(sentEvents).toContainEqual({
      channel: 'sftp:searchProgress',
      payload: { searchId, type: 'cancelled', error: 'Search cancelled' }
    })
  })

  it('emits an error event when the search rejects with a non-cancellation error', async () => {
    const search = makeControllableSearch()
    const sftp = { searchInFolder: search.searchInFolder } as unknown as ISftpService
    registerSftpIpc(sftp, {} as TempFileManager, {} as DownloadTransferRegistry, new SearchTransferRegistry())

    const handler = handlers.get('sftp:searchInFolder')!
    const { searchId } = handler(fakeEvent, 'sess-1', '/proj', 'term') as { searchId: string }

    search.reject(new Error('Connection lost'))
    await flushMicrotasks()

    expect(sentEvents).toContainEqual({
      channel: 'sftp:searchProgress',
      payload: { searchId, type: 'error', error: 'Connection lost' }
    })
  })

  it('cancelSearch on an unknown id is a silent no-op', async () => {
    const sftp = { searchInFolder: vi.fn() } as unknown as ISftpService
    registerSftpIpc(sftp, {} as TempFileManager, {} as DownloadTransferRegistry, new SearchTransferRegistry())

    const cancelHandler = handlers.get('sftp:cancelSearch')!
    await expect(cancelHandler(fakeEvent, 'unknown-id')).resolves.toBeUndefined()
  })
})
