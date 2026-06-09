import { useEffect, useState } from 'react'
import { TreeNode } from './TreeNode'
import { Spinner } from '../commons/Spinner'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'
import type { FileNode } from '../../../domain/entities/FileNode'

export function FileExplorer() {
  const api = getRemoteApi()
  const { activeSession, notify } = useApp()
  const [rootNodes, setRootNodes] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    if (!activeSession) return
    setIsLoading(true)
    try {
      const nodes = await api.sftp.listDir(activeSession.sessionId, '/')
      setRootNodes(nodes)
    } catch (err: unknown) {
      notify('error', `Failed to load files: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [activeSession?.sessionId])

  if (!activeSession) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted truncate">
          {activeSession.connectionLabel}
        </span>
        <button
          onClick={load}
          className="text-ide-text-muted hover:text-ide-text text-xs"
          title="Refresh"
        >
          ↺
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Spinner />
          </div>
        ) : (
          rootNodes.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              sessionId={activeSession.sessionId}
            />
          ))
        )}
      </div>
    </div>
  )
}
