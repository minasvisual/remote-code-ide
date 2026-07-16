export interface DownloadProgressPayload {
  transferId: string
  transferred: number
  total?: number
  status: 'downloading' | 'done' | 'error' | 'cancelled'
  error?: string
}

export interface ProgressThrottle {
  onProgress: (transferred: number, total?: number) => void
  /** Unconditionally emits the last known progress with a terminal status, bypassing the throttle window. */
  flushFinal: (status: 'done' | 'error' | 'cancelled', error?: string) => void
}

export function createProgressThrottle(
  send: (payload: DownloadProgressPayload) => void,
  transferId: string,
  throttleMs = 200,
  now: () => number = Date.now
): ProgressThrottle {
  let lastEmitAt = -Infinity
  let last: DownloadProgressPayload = { transferId, transferred: 0, status: 'downloading' }

  const onProgress = (transferred: number, total?: number) => {
    last = { transferId, transferred, total, status: 'downloading' }
    const ts = now()
    if (ts - lastEmitAt >= throttleMs) {
      lastEmitAt = ts
      send(last)
    }
  }

  const flushFinal = (status: 'done' | 'error' | 'cancelled', error?: string) => {
    last = { ...last, status, error }
    send(last)
  }

  return { onProgress, flushFinal }
}
