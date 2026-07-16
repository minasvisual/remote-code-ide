import { useCallback, useState } from 'react'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'

interface PasteConflict {
  targetDir: string
  name: string
}

/**
 * Shared attempt → DEST_EXISTS → confirm → retry-with-overwrite paste flow
 * (design.md Decision 2), reused by TreeNode.tsx and FileExplorer.tsx.
 */
export function usePaste(onPasted: (targetDir: string) => void) {
  const api = getRemoteApi()
  const { clipboard, notify } = useApp()
  const [conflict, setConflict] = useState<PasteConflict | null>(null)

  const attemptPaste = useCallback(
    async (targetDir: string, overwrite: boolean) => {
      if (!clipboard) return
      const destPath = targetDir === '/' ? `/${clipboard.name}` : `${targetDir}/${clipboard.name}`
      try {
        await api.sftp.copy(clipboard.sessionId, clipboard.path, destPath, clipboard.type, overwrite)
        setConflict(null)
        notify('success', `Pasted "${clipboard.name}"`)
        onPasted(targetDir)
      } catch (err: unknown) {
        const e = err as { code?: string; message: string }
        if (e.code === 'DEST_EXISTS') {
          setConflict({ targetDir, name: clipboard.name })
        } else {
          setConflict(null)
          notify('error', `Failed to paste "${clipboard.name}": ${e.message}`)
        }
      }
    },
    [api, clipboard, notify, onPasted]
  )

  const paste = useCallback((targetDir: string) => attemptPaste(targetDir, false), [attemptPaste])

  const confirmOverwrite = useCallback(() => {
    if (conflict) attemptPaste(conflict.targetDir, true)
  }, [attemptPaste, conflict])

  const cancelOverwrite = useCallback(() => setConflict(null), [])

  return { paste, conflict, confirmOverwrite, cancelOverwrite }
}
