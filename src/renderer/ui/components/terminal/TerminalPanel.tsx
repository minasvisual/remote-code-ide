import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'

interface Props {
  overrideDir?: string
}

export function TerminalPanel({ overrideDir }: Props) {
  const api = getRemoteApi()
  const { activeSession, notify } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const termIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initialDir = overrideDir ?? activeSession?.initialDirectory

  useEffect(() => {
    if (!activeSession || !containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        black: '#1e1e1e',
        blue: '#569cd6',
        green: '#4ec9b0',
        cyan: '#9cdcfe',
        red: '#f44747',
        yellow: '#dcdcaa',
        magenta: '#c586c0',
        white: '#d4d4d4'
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitRef.current = fitAddon

    const { cols, rows } = term

    api.terminal.create(activeSession.sessionId, cols, rows, initialDir).then((id) => {
      termIdRef.current = id
      setIsReady(true)

      term.onData((data) => api.terminal.sendInput(id, data))

      api.terminal.onOutput((termId, data) => {
        if (termId === id) term.write(data)
      })
    }).catch((err: unknown) => {
      notify('error', `Terminal error: ${(err as Error).message}`)
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (termIdRef.current) {
        api.terminal.resize(termIdRef.current, term.cols, term.rows)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (termIdRef.current) api.terminal.close(termIdRef.current)
      term.dispose()
      termRef.current = null
      termIdRef.current = null
      setIsReady(false)
    }
  }, [activeSession?.sessionId, overrideDir])

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center h-full text-ide-text-muted text-sm">
        Connect to a server to open a terminal
      </div>
    )
  }

  return (
    <div className="relative h-full bg-ide-bg">
      <div ref={containerRef} className="w-full h-full p-1" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-ide-bg text-ide-text-muted text-sm">
          Opening terminal…
        </div>
      )}
    </div>
  )
}
