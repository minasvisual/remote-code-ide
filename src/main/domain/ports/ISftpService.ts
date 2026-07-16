import type { FileNode } from '../entities/FileNode'

export interface DownloadOptions {
  transferId: string
  signal?: AbortSignal
  onProgress?: (transferred: number, total?: number) => void
}

export interface SearchLineMatch {
  line: number
  text: string
}

export interface SearchFileMatch {
  path: string
  name: string
  totalMatches: number
  matches: SearchLineMatch[]
}

export interface SearchOptions {
  signal?: AbortSignal
  onMatch?: (result: SearchFileMatch) => void
}

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  itemCount?: number
  permissions: string
  owner: number
  group: number
  modifiedAt: string
  accessedAt: string
  symlinkTarget?: string
}

export interface ISftpService {
  listDir(sessionId: string, path: string): Promise<FileNode[]>
  /**
   * Fetches fresh metadata for a single file/directory/symlink via `stat` (plus `readlink`
   * for symlinks and `listDir` for directories) — never reuses the tree's cached `FileNode`.
   */
  getFileInfo(sessionId: string, path: string): Promise<FileInfo>
  readFile(sessionId: string, remotePath: string): Promise<Buffer>
  writeFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>
  rename(sessionId: string, oldPath: string, newPath: string): Promise<void>
  mkdir(sessionId: string, path: string): Promise<void>
  delete(sessionId: string, path: string): Promise<void>
  deleteRecursive(sessionId: string, path: string): Promise<void>
  createFile(sessionId: string, path: string): Promise<void>
  uploadFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>
  mkdirp(sessionId: string, path: string): Promise<void>
  /**
   * Streams a remote file to a local path, reporting progress via `onProgress` if provided.
   * If `signal` aborts mid-stream, the partial local file is deleted and the returned promise
   * rejects with an `Error` carrying `code: 'CANCELLED'` (mirroring the `DEST_EXISTS` convention on `copy`).
   */
  downloadFile(sessionId: string, remotePath: string, localPath: string, options: DownloadOptions): Promise<void>
  /**
   * Recursively zips a remote directory to a local path, reporting progress via `onProgress` if provided.
   * If `signal` aborts mid-stream, the partial local `.zip` is deleted and the returned promise
   * rejects with an `Error` carrying `code: 'CANCELLED'` (mirroring the `DEST_EXISTS` convention on `copy`).
   */
  downloadFolderAsZip(
    sessionId: string,
    remotePath: string,
    localZipPath: string,
    options: DownloadOptions
  ): Promise<void>
  /**
   * Recursively copies a file or directory server-side over SFTP.
   * Throws an error with `code: 'DEST_EXISTS'` if `destPath` already exists and `overwrite` is not `true`.
   */
  copy(
    sessionId: string,
    sourcePath: string,
    destPath: string,
    type: 'file' | 'directory',
    overwrite?: boolean
  ): Promise<void>
  /**
   * Recursively searches a remote directory tree for literal, case-insensitive substring matches of
   * `query`, invoking `options.onMatch` for each file with at least one match as soon as it's found.
   * Files larger than 2 MB and files identified as binary (a null byte in the first 8 KB) are skipped
   * silently. A failure to list a subdirectory or read an individual file is swallowed — the rest of the
   * tree keeps being scanned. If `options.signal` aborts mid-walk, the returned promise rejects with an
   * `Error` carrying `code: 'CANCELLED'` (mirroring `downloadFile`'s convention); otherwise it resolves
   * once the entire tree has been walked.
   */
  searchInFolder(sessionId: string, rootPath: string, query: string, options: SearchOptions): Promise<void>
}
