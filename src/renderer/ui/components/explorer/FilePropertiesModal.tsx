import { useEffect, useState } from 'react'
import { Modal } from '../commons/Modal'
import { Spinner } from '../commons/Spinner'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import type { FileNode } from '../../../domain/entities/FileNode'
import type { FileInfo } from '../../../domain/ports/IRemoteApi'

interface Props {
  node: FileNode
  sessionId: string
  onClose(): void
}

const TYPE_LABELS: Record<FileInfo['type'], string> = {
  file: 'File',
  directory: 'Folder',
  symlink: 'Symbolic Link'
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  const readable = unitIndex === 0 ? `${value}` : value.toFixed(1)
  return `${readable} ${units[unitIndex]} (${bytes.toLocaleString()} bytes)`
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(idx + 1) : ''
}

function toSymbolicPermissions(octal: string): string {
  const mode = parseInt(octal, 8) || 0
  const triads = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const owner = triads[(mode >> 6) & 7]
  const group = triads[(mode >> 3) & 7]
  const other = triads[mode & 7]
  return `${owner}${group}${other}`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-ide-text-muted">{label}</span>
      <span className="text-ide-text text-right break-all">{value}</span>
    </div>
  )
}

export function FilePropertiesModal({ node, sessionId, onClose }: Props) {
  const api = getRemoteApi()
  const [info, setInfo] = useState<FileInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    api.sftp.getFileInfo(sessionId, node.path)
      .then((result) => { if (!cancelled) setInfo(result) })
      .catch((err: unknown) => { if (!cancelled) setError((err as Error).message) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [api, sessionId, node.path])

  const extension = getExtension(node.name)

  return (
    <Modal title="Properties" onClose={onClose}>
      {isLoading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-red-400">Failed to load properties: {error}</p>
      )}

      {!isLoading && !error && info && (
        <div className="divide-y divide-ide-border">
          <Field label="Name" value={info.name} />
          <Field label="Path" value={info.path} />
          <Field label="Type" value={TYPE_LABELS[info.type]} />
          {info.type === 'file' && extension && <Field label="Extension" value={extension} />}
          <Field label="Size" value={formatBytes(info.size)} />
          {info.type === 'directory' && (
            <Field label="Items" value={`${info.itemCount ?? 0} items`} />
          )}
          <Field label="Permissions" value={`${info.permissions} (${toSymbolicPermissions(info.permissions)})`} />
          <Field label="Owner" value={`UID ${info.owner}`} />
          <Field label="Group" value={`GID ${info.group}`} />
          <Field label="Modified" value={formatDate(info.modifiedAt)} />
          <Field label="Accessed" value={formatDate(info.accessedAt)} />
          {info.type === 'symlink' && (
            <Field label="Target" value={info.symlinkTarget ?? '—'} />
          )}
        </div>
      )}
    </Modal>
  )
}
