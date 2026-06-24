import { useCallback, useEffect, useRef, useState } from 'react'
import { Spinner } from '../commons/Spinner'
import { ContextMenu } from '../commons/ContextMenu'
import { Modal } from '../commons/Modal'
import { NewFileDialog } from '../commons/NewFileDialog'
import { Button } from '../commons/Button'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useEditor } from '../../../application/contexts/EditorContext'
import { useApp } from '../../../application/contexts/AppContext'
import type { FileNode } from '../../../domain/entities/FileNode'

interface Props {
  node: FileNode
  sessionId: string
  depth?: number
  onDelete?: (node: FileNode) => void
  onRename?: (node: FileNode, newName: string) => void
  onUpload?: (targetDir: string, mode: 'files' | 'folder') => void
  onOpenTerminal?: (path: string) => void
  refreshSignal?: number
  refreshTarget?: { path: string; tick: number } | null
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

export function TreeNode({ node, sessionId, depth = 0, onDelete, onRename, onUpload, onOpenTerminal, refreshSignal, refreshTarget }: Props) {
  const api = getRemoteApi()
  const { openFile } = useEditor()
  const { notify } = useApp()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [children, setChildren] = useState<FileNode[]>(node.children ?? [])
  const [loaded, setLoaded] = useState(node.isLoaded)
  const [subtreeRefreshSignal, setSubtreeRefreshSignal] = useState(0)
  const [subtreeRefreshTarget, setSubtreeRefreshTarget] = useState<{ path: string; tick: number } | null>(null)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  const [newFileOpen, setNewFileOpen] = useState(false)
  const [newFileError, setNewFileError] = useState<string | undefined>()

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderError, setNewFolderError] = useState<string | undefined>()

  const loadedRef = useRef(loaded)
  useEffect(() => { loadedRef.current = loaded }, [loaded])

  const doRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const items = await api.sftp.listDir(sessionId, node.path)
      setChildren(items)
      setLoaded(true)
      setIsExpanded(true)
      setSubtreeRefreshSignal((s) => s + 1)
    } catch (err: unknown) {
      notify('error', `Failed to refresh ${node.name}: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }, [api, sessionId, node.path, node.name, notify])

  // Cascade refresh from parent: re-fetch only if this dir was already loaded
  useEffect(() => {
    if (!refreshSignal || node.type !== 'directory' || !loadedRef.current) return
    doRefresh()
  }, [refreshSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Targeted refresh after upload: route the signal down to the exact directory
  useEffect(() => {
    if (!refreshTarget || node.type !== 'directory') return
    if (node.path === refreshTarget.path) {
      if (loadedRef.current) doRefresh()
    } else if (refreshTarget.path.startsWith(node.path + '/')) {
      setSubtreeRefreshTarget(refreshTarget)
    }
  }, [refreshTarget?.path, refreshTarget?.tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChildDelete = useCallback((deleted: FileNode) => {
    setChildren((prev) => prev.filter((c) => c.path !== deleted.path))
  }, [])

  const handleChildRename = useCallback((renamed: FileNode, newName: string) => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.path !== renamed.path) return c
        const parentDir = renamed.path.substring(0, renamed.path.lastIndexOf('/')) || '/'
        const newPath = parentDir === '/' ? `/${newName}` : `${parentDir}/${newName}`
        return { ...c, name: newName, path: newPath }
      })
    )
  }, [])

  const handleClick = async () => {
    if (isRenaming) return
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleDeleteClick = () => {
    setDeleteTarget(node)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'directory') {
        await api.sftp.deleteRecursive(sessionId, deleteTarget.path)
      } else {
        await api.sftp.delete(sessionId, deleteTarget.path)
      }
      onDelete?.(deleteTarget)
    } catch (err: unknown) {
      notify('error', `Failed to delete ${deleteTarget.name}: ${(err as Error).message}`)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleRenameClick = () => {
    setIsRenaming(true)
    setRenameValue(node.name)
    setTimeout(() => renameRef.current?.select(), 0)
  }

  const commitRename = async () => {
    const newName = renameValue.trim()
    if (!newName) {
      setIsRenaming(false)
      notify('error', 'Name cannot be empty')
      return
    }
    if (newName === node.name) {
      setIsRenaming(false)
      return
    }
    const parentDir = node.path.substring(0, node.path.lastIndexOf('/')) || '/'
    const newPath = parentDir === '/' ? `/${newName}` : `${parentDir}/${newName}`
    setIsRenaming(false)
    try {
      await api.sftp.rename(sessionId, node.path, newPath)
      onRename?.(node, newName)
    } catch (err: unknown) {
      notify('error', `Failed to rename ${node.name}: ${(err as Error).message}`)
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
    }
  }

  const handleNewFileConfirm = async (filename: string) => {
    const path = node.path === '/' ? `/${filename}` : `${node.path}/${filename}`
    try {
      await api.sftp.createFile(sessionId, path)
      const updated = await api.sftp.listDir(sessionId, node.path)
      setChildren(updated)
      setLoaded(true)
      setIsExpanded(true)
      setNewFileOpen(false)
      setNewFileError(undefined)
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      if (e.code === 'FILE_EXISTS') {
        setNewFileError(`A file named "${filename}" already exists`)
      } else {
        setNewFileOpen(false)
        setNewFileError(undefined)
        notify('error', `Failed to create file: ${e.message}`)
      }
    }
  }

  const handleNewFileCancel = () => {
    setNewFileOpen(false)
    setNewFileError(undefined)
  }

  const handleNewFolderConfirm = async (name: string) => {
    const path = node.path === '/' ? `/${name}` : `${node.path}/${name}`
    try {
      await api.sftp.mkdir(sessionId, path)
      const updated = await api.sftp.listDir(sessionId, node.path)
      setChildren(updated)
      setLoaded(true)
      setIsExpanded(true)
      setNewFolderOpen(false)
      setNewFolderError(undefined)
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      if (e.code === 'FILE_EXISTS') {
        setNewFolderError(`A folder named "${name}" already exists`)
      } else {
        setNewFolderOpen(false)
        setNewFolderError(undefined)
        notify('error', `Failed to create folder: ${e.message}`)
      }
    }
  }

  const handleNewFolderCancel = () => {
    setNewFolderOpen(false)
    setNewFolderError(undefined)
  }

  const indent = depth * 12

  const deleteMessage = deleteTarget?.type === 'directory'
    ? `This will permanently delete the folder "${deleteTarget.name}" and ALL its contents. This cannot be undone.`
    : `Delete "${deleteTarget?.name}"? This action cannot be undone.`

  const uploadTargetDir = node.type === 'directory'
    ? node.path
    : node.path.substring(0, node.path.lastIndexOf('/')) || '/'

  const contextMenuItems: import('../commons/ContextMenu').ContextMenuItem[] = [
    { label: 'Rename', onClick: handleRenameClick },
    { label: 'Delete', onClick: handleDeleteClick },
    { type: 'divider' as const },
    { label: 'Upload files here', onClick: () => onUpload?.(uploadTargetDir, 'files') },
    { label: 'Upload folder here', onClick: () => onUpload?.(uploadTargetDir, 'folder') },
    ...(node.type === 'directory' ? [
      { type: 'divider' as const },
      { label: 'Open Terminal Here', onClick: () => onOpenTerminal?.(node.path) },
      { type: 'divider' as const },
      { label: 'New File', onClick: () => { setNewFileError(undefined); setNewFileOpen(true) } },
      { label: 'New Folder', onClick: () => { setNewFolderError(undefined); setNewFolderOpen(true) } },
      { label: 'Refresh', onClick: doRefresh },
    ] : []),
  ]

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-ide-hover text-sm text-ide-text select-none"
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
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
        {isRenaming ? (
          <input
            ref={renameRef}
            autoFocus
            className="bg-[#3c3c3c] border border-ide-accent rounded px-1 text-sm text-ide-text focus:outline-none flex-1 min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
          header={node.name}
        />
      )}

      {deleteTarget && (
        <Modal
          title="Confirm Delete"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>Delete</Button>
            </>
          }
        >
          <p className="text-sm text-ide-text">{deleteMessage}</p>
        </Modal>
      )}

      {newFileOpen && (
        <NewFileDialog
          targetDir={node.path}
          error={newFileError}
          onConfirm={handleNewFileConfirm}
          onCancel={handleNewFileCancel}
        />
      )}

      {newFolderOpen && (
        <NewFileDialog
          title="New Folder"
          placeholder="folder-name"
          targetDir={node.path}
          error={newFolderError}
          onConfirm={handleNewFolderConfirm}
          onCancel={handleNewFolderCancel}
        />
      )}

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
              <TreeNode
                key={child.path}
                node={child}
                sessionId={sessionId}
                depth={depth + 1}
                onDelete={handleChildDelete}
                onRename={handleChildRename}
                onUpload={onUpload}
                onOpenTerminal={onOpenTerminal}
                refreshSignal={subtreeRefreshSignal}
                refreshTarget={subtreeRefreshTarget}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
