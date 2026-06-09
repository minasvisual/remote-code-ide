import { useState } from 'react'
import { Spinner } from '../commons/Spinner'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useEditor } from '../../../application/contexts/EditorContext'
import { useApp } from '../../../application/contexts/AppContext'
import type { FileNode } from '../../../domain/entities/FileNode'

interface Props {
  node: FileNode
  sessionId: string
  depth?: number
}

const FILE_ICONS: Record<string, string> = {
  ts: '📘', tsx: '📘', js: '📒', jsx: '📒', json: '📋',
  py: '🐍', php: '🐘', go: '🐹', rs: '🦀', rb: '💎',
  html: '🌐', css: '🎨', scss: '🎨', md: '📝', sql: '🗄',
  sh: '⚙', bash: '⚙', dockerfile: '🐳', yaml: '📄', yml: '📄'
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return FILE_ICONS[ext] ?? '📄'
}

export function TreeNode({ node, sessionId, depth = 0 }: Props) {
  const api = getRemoteApi()
  const { openFile } = useEditor()
  const { notify } = useApp()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [children, setChildren] = useState<FileNode[]>(node.children ?? [])
  const [loaded, setLoaded] = useState(node.isLoaded)

  const handleClick = async () => {
    if (node.type === 'file') {
      openFile(node, sessionId)
      return
    }

    if (node.type === 'directory') {
      if (!isExpanded && !loaded) {
        setIsLoading(true)
        try {
          const items = await api.sftp.listDir(sessionId, node.path)
          setChildren(items)
          setLoaded(true)
        } catch (err: unknown) {
          notify('error', `Failed to list ${node.name}: ${(err as Error).message}`)
        } finally {
          setIsLoading(false)
        }
      }
      setIsExpanded((v) => !v)
    }
  }

  const indent = depth * 12

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-ide-hover text-sm text-ide-text select-none"
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' ? (
          <>
            {isLoading ? (
              <Spinner size="sm" />
            ) : (
              <span className="text-ide-text-muted text-xs w-3">{isExpanded ? '▾' : '▸'}</span>
            )}
            <span>{isExpanded ? '📂' : '📁'}</span>
          </>
        ) : (
          <>
            <span className="w-3" />
            <span>{getFileIcon(node.name)}</span>
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === 'directory' && isExpanded && (
        <div>
          {children.length === 0 && !isLoading ? (
            <div
              className="px-2 py-0.5 text-xs text-ide-text-muted italic"
              style={{ paddingLeft: `${8 + indent + 20}px` }}
            >
              empty
            </div>
          ) : (
            children.map((child) => (
              <TreeNode key={child.path} node={child} sessionId={sessionId} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
