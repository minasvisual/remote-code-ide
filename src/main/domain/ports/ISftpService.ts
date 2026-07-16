import type { FileNode } from '../entities/FileNode'

export interface ISftpService {
  listDir(sessionId: string, path: string): Promise<FileNode[]>
  readFile(sessionId: string, remotePath: string): Promise<Buffer>
  writeFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>
  rename(sessionId: string, oldPath: string, newPath: string): Promise<void>
  mkdir(sessionId: string, path: string): Promise<void>
  delete(sessionId: string, path: string): Promise<void>
  deleteRecursive(sessionId: string, path: string): Promise<void>
  createFile(sessionId: string, path: string): Promise<void>
  uploadFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>
  mkdirp(sessionId: string, path: string): Promise<void>
  downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<void>
  downloadFolderAsZip(sessionId: string, remotePath: string, localZipPath: string): Promise<void>
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
}
