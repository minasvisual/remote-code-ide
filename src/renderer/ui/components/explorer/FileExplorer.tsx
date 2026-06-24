import { useCallback, useEffect, useRef, useState } from 'react'
import { TreeNode } from './TreeNode'
import { Spinner } from '../commons/Spinner'
import { NewFileDialog } from '../commons/NewFileDialog'
import { UploadDialog } from '../commons/UploadDialog'
import type { UploadEntry } from '../commons/UploadDialog'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'
import type { FileNode } from '../../../domain/entities/FileNode'

export function FileExplorer() {
  const api = getRemoteApi()
  const { activeSession, notify, disconnect, openTerminalAt } = useApp()
  const [rootNodes, setRootNodes] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newFileTargetDir, setNewFileTargetDir] = useState<string | null>(null)
  const [newFileError, setNewFileError] = useState<string | undefined>()
  const [newFolderTargetDir, setNewFolderTargetDir] = useState<string | null>(null)
  const [newFolderError, setNewFolderError] = useState<string | undefined>()
  const [uploadEntries, setUploadEntries] = useState<UploadEntry[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [refreshTarget, setRefreshTarget] = useState<{ path: string; tick: number } | null>(null)
  const uploadUnsubscribeRef = useRef<(() => void) | null>(null)
  const uploadTargetDirRef = useRef<string>('/')

  const load = async () => {
    if (!activeSession) return
    setIsLoading(true)
    try {
      const nodes = await api.sftp.listDir(activeSession.sessionId, activeSession.initialDirectory || '/')
      setRootNodes(nodes)
    } catch (err: unknown) {
      notify('error', `Failed to load files: ${(err as Error).message}`)
      if (activeSession.initialDirectory) {
        disconnect()
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [activeSession?.sessionId])

  const handleDelete = useCallback((node: FileNode) => {
    setRootNodes((prev) => prev.filter((n) => n.path !== node.path))
  }, [])

  const handleRename = useCallback((node: FileNode, newName: string) => {
    setRootNodes((prev) =>
      prev.map((n) => {
        if (n.path !== node.path) return n
        const parentDir = node.path.substring(0, node.path.lastIndexOf('/')) || '/'
        const newPath = parentDir === '/' ? `/${newName}` : `${parentDir}/${newName}`
        return { ...n, name: newName, path: newPath }
      })
    )
  }, [])

  const handleNewFileConfirm = useCallback(async (filename: string) => {
    if (!activeSession || !newFileTargetDir) return
    const path = newFileTargetDir === '/' ? `/${filename}` : `${newFileTargetDir}/${filename}`
    try {
      await api.sftp.createFile(activeSession.sessionId, path)
      setNewFileTargetDir(null)
      setNewFileError(undefined)
      await load()
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      if (e.code === 'FILE_EXISTS') {
        setNewFileError(`A file named "${filename}" already exists`)
      } else {
        setNewFileTargetDir(null)
        setNewFileError(undefined)
        notify('error', `Failed to create file: ${e.message}`)
      }
    }
  }, [activeSession, newFileTargetDir, api, notify])

  const handleNewFileCancel = useCallback(() => {
    setNewFileTargetDir(null)
    setNewFileError(undefined)
  }, [])

  const handleNewFolderConfirm = useCallback(async (name: string) => {
    if (!activeSession || !newFolderTargetDir) return
    const path = newFolderTargetDir === '/' ? `/${name}` : `${newFolderTargetDir}/${name}`
    try {
      await api.sftp.mkdir(activeSession.sessionId, path)
      setNewFolderTargetDir(null)
      setNewFolderError(undefined)
      await load()
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      if (e.code === 'FILE_EXISTS') {
        setNewFolderError(`A folder named "${name}" already exists`)
      } else {
        setNewFolderTargetDir(null)
        setNewFolderError(undefined)
        notify('error', `Failed to create folder: ${e.message}`)
      }
    }
  }, [activeSession, newFolderTargetDir, api, notify])

  const handleNewFolderCancel = useCallback(() => {
    setNewFolderTargetDir(null)
    setNewFolderError(undefined)
  }, [])

  const handleUpload = useCallback(async (targetDir: string, mode: 'files' | 'folder' = 'files') => {
    if (!activeSession) return
    const paths = await api.sftp.openUploadDialog(mode)
    if (!paths || paths.length === 0) return

    uploadTargetDirRef.current = targetDir
    setUploadEntries([])
    setShowUploadDialog(true)

    uploadUnsubscribeRef.current?.()
    uploadUnsubscribeRef.current = api.sftp.onUploadProgress((event) => {
      setUploadEntries((prev) => {
        const idx = prev.findIndex((e) => e.remoteName === event.remoteName)
        const entry: UploadEntry = { remoteName: event.remoteName, status: event.status, error: event.error }
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = entry
          return updated
        }
        return [...prev, entry]
      })
    })

    api.sftp.uploadFiles(activeSession.sessionId, targetDir, paths).catch((err: Error) => {
      notify('error', `Upload failed: ${err.message}`)
    })
  }, [activeSession, api, notify])

  const handleUploadDialogClose = useCallback(() => {
    const targetDir = uploadTargetDirRef.current
    uploadUnsubscribeRef.current?.()
    uploadUnsubscribeRef.current = null
    setShowUploadDialog(false)
    setUploadEntries([])
    if (targetDir === '/') {
      load()
    } else {
      setRefreshTarget({ path: targetDir, tick: Date.now() })
    }
  }, [activeSession])

  if (!activeSession) return null

  const rootDir = activeSession.initialDirectory || '/'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted truncate">
          {activeSession.connectionLabel}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setNewFileError(undefined); setNewFileTargetDir(rootDir) }}
            className="text-ide-text-muted hover:text-ide-text"
            title="New File"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9 1H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6l-5-5zm-1 5V2.5L12.5 7H9a1 1 0 0 1-1-1zm3 4.5h-1.5V12H8v-1.5H6.5V9H8V7.5h1.5V9H11v1.5z"/>
            </svg>
          </button>
          <button
            onClick={() => { setNewFolderError(undefined); setNewFolderTargetDir(rootDir) }}
            className="text-ide-text-muted hover:text-ide-text"
            title="New Folder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.086a1.5 1.5 0 0 1 1.06.44L7.707 3.5H13.5A1.5 1.5 0 0 1 15 5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12V3.5zm7 4.5H6.5v1.5H5v1H6.5V12h1v-1.5H9v-1H7.5V8z"/>
            </svg>
          </button>
          <button
            onClick={() => handleUpload(rootDir, 'files')}
            className="text-ide-text-muted hover:text-ide-text"
            title="Upload Files"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2a1 1 0 0 0-1 1v2.5h14V4.5a1 1 0 0 0-1-1h-3z"/>
              <path d="M1 6.5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7H1zm5.5 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H8v2.5a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
          <button
            onClick={() => handleUpload(rootDir, 'folder')}
            className="text-ide-text-muted hover:text-ide-text"
            title="Upload Folder"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h3.879a1.5 1.5 0 0 1 1.06.44L9.5 2.5H13.5A1.5 1.5 0 0 1 15 4v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 11V4a1.5 1.5 0 0 1 1-1.4V2.5zM8 5.5a.5.5 0 0 0-1 0V8H4.5a.5.5 0 0 0 0 1H7v2.5a.5.5 0 0 0 1 0V9h2.5a.5.5 0 0 0 0-1H8V5.5z"/>
            </svg>
          </button>
          <button
            onClick={load}
            className="text-ide-text-muted hover:text-ide-text text-xs"
            title="Refresh"
          >
            ↺
          </button>
        </div>
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
              onDelete={handleDelete}
              onRename={handleRename}
              onUpload={handleUpload}
              onOpenTerminal={openTerminalAt}
              refreshTarget={refreshTarget}
            />
          ))
        )}
      </div>

      {newFileTargetDir && (
        <NewFileDialog
          targetDir={newFileTargetDir}
          error={newFileError}
          onConfirm={handleNewFileConfirm}
          onCancel={handleNewFileCancel}
        />
      )}

      {newFolderTargetDir && (
        <NewFileDialog
          title="New Folder"
          placeholder="folder-name"
          targetDir={newFolderTargetDir}
          error={newFolderError}
          onConfirm={handleNewFolderConfirm}
          onCancel={handleNewFolderCancel}
        />
      )}

      {showUploadDialog && (
        <UploadDialog
          entries={uploadEntries}
          onClose={handleUploadDialogClose}
        />
      )}
    </div>
  )
}
