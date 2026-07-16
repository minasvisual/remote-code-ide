import { describe, it, expect, vi } from 'vitest'
import { createProgressThrottle, type DownloadProgressPayload } from '../downloadProgressThrottle'

function makeClock(start = 0) {
  let now = start
  return { now: () => now, advance: (ms: number) => { now += ms } }
}

describe('createProgressThrottle', () => {
  it('emits the first call immediately', () => {
    const sent: DownloadProgressPayload[] = []
    const clock = makeClock()
    const { onProgress } = createProgressThrottle((p) => sent.push(p), 't1', 200, clock.now)

    onProgress(10, 100)

    expect(sent).toEqual([{ transferId: 't1', transferred: 10, total: 100, status: 'downloading' }])
  })

  it('collapses rapid calls within the throttle window to a single emit', () => {
    const sent: DownloadProgressPayload[] = []
    const clock = makeClock()
    const { onProgress } = createProgressThrottle((p) => sent.push(p), 't1', 200, clock.now)

    onProgress(10, 100)
    clock.advance(50)
    onProgress(20, 100)
    clock.advance(50)
    onProgress(30, 100)
    clock.advance(50)
    onProgress(40, 100)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ transferred: 10 })
  })

  it('emits again once the throttle window has elapsed', () => {
    const sent: DownloadProgressPayload[] = []
    const clock = makeClock()
    const { onProgress } = createProgressThrottle((p) => sent.push(p), 't1', 200, clock.now)

    onProgress(10, 100)
    clock.advance(199)
    onProgress(20, 100)
    clock.advance(1)
    onProgress(30, 100)

    expect(sent).toHaveLength(2)
    expect(sent[1]).toMatchObject({ transferred: 30 })
  })

  it('flushFinal always emits regardless of the throttle window, carrying the terminal status', () => {
    const sent: DownloadProgressPayload[] = []
    const clock = makeClock()
    const { onProgress, flushFinal } = createProgressThrottle((p) => sent.push(p), 't1', 200, clock.now)

    onProgress(10, 100)
    clock.advance(1)
    onProgress(99, 100)
    flushFinal('done')

    expect(sent).toHaveLength(2)
    expect(sent[1]).toEqual({ transferId: 't1', transferred: 99, total: 100, status: 'done', error: undefined })
  })

  it('flushFinal reports an error status with a message', () => {
    const sent: DownloadProgressPayload[] = []
    const send = vi.fn((p: DownloadProgressPayload) => sent.push(p))
    const { flushFinal } = createProgressThrottle(send, 't1')

    flushFinal('error', 'Connection lost')

    expect(sent[0]).toMatchObject({ status: 'error', error: 'Connection lost' })
  })
})
