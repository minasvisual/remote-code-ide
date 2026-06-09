import type { FileNode } from '../entities/FileNode'

export interface ISftpService {
  listDir(sessionId: string, path: string): Promise<FileNode[]>
  readFile(sessionId: string, remotePath: string): Promise<Buffer>
  writeFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>
  rename(sessionId: string, oldPath: string, newPath: string): Promise<void>
  mkdir(sessionId: string, path: string): Promise<void>
  delete(sessionId: string, path: string): Promise<void>
}
