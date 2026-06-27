import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'
import { TerminalContextMenu } from './TerminalContextMenu'

interface Props {
  overrideDir?: string
}

const isMac = navigator.platform.toUpperCase().includes('MAC')

async function copySelection(term: Terminal): Promise<boolean> {
  const selection = term.getSelection()
  if (!selection) return false
  try {
    await navigator.clipboard.writeText(selection)
    return true
  } catch {
    return false
  }
}

async function pasteToTerminal(term: Terminal): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText()
    if (text) term.paste(text)
    return true
  } catch {
    return false
  }
}

export function TerminalPanel({ overrideDir }: Props) {
  const api = getRemoteApi()
  const { activeSession, notify } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const termIdRef = useRef<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const initialDir = overrideDir ?? activeSession?.initialDirectory

  const handleCopy = useCallback(async () => {
    const term = termRef.current
    if (!term) return
    const ok = await copySelection(term)
    if (!ok) notify('error', 'Failed to copy to clipboard')
    setContextMenu(null)
    term.focus()
  }, [notify])

  const handlePaste = useCallback(async () => {
    const term = termRef.current
    if (!term) return
    const ok = await pasteToTerminal(term)
    if (!ok) notify('error', 'Failed to read clipboard')
    setContextMenu(null)
    term.focus()
  }, [notify])

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

    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type !== 'keydown') return true

      if (isMac) {
        if (e.metaKey && e.key === 'c') {
          const selection = term.getSelection()
          if (selection) {
            copySelection(term).then(ok => {
              if (!ok) notify('error', 'Failed to copy to clipboard')
            })
            return false
          }
          return true
        }
        if (e.metaKey && e.key === 'v') {
          pasteToTerminal(term).then(ok => {
            if (!ok) notify('error', 'Failed to read clipboard')
          })
          return false
        }
      } else {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          const selection = term.getSelection()
          if (selection) {
            copySelection(term).then(ok => {
              if (!ok) notify('error', 'Failed to copy to clipboard')
            })
            return false
          }
          return true
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
          pasteToTerminal(term).then(ok => {
            if (!ok) notify('error', 'Failed to read clipboard')
          })
          return false
        }
      }

      return true
    })

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const dismissContextMenu = useCallback(() => {
    setContextMenu(null)
    termRef.current?.focus()
  }, [])

  if (!activeSession) {
    return (
      <div className="flex items-center justify-center h-full text-ide-text-muted text-sm">
        Connect to a server to open a terminal
      </div>
    )
  }

  return (
    <div className="relative h-full bg-ide-bg" onContextMenu={handleContextMenu}>
      <div ref={containerRef} className="w-full h-full p-1" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-ide-bg text-ide-text-muted text-sm">
          Opening terminal…
        </div>
      )}
      {contextMenu && (
        <TerminalContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasSelection={!!termRef.current?.getSelection()}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDismiss={dismissContextMenu}
        />
      )}
    </div>
  )
}
