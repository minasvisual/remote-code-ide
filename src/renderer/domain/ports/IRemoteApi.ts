import type { Connection, NewConnection } from '../entities/Connection'
import type { FileNode } from '../entities/FileNode'

export interface TestResult {
  success: boolean
  message: string
}

export interface ConnectResult {
  success: boolean
  sessionId: string
  message?: string
}

export interface ReadFileResult {
  localTempPath: string
  content: string
}

export interface UploadProgressEvent {
  localPath: string
  remoteName: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export interface IRemoteApi {
  connections: {
    list(): Promise<Connection[]>
    save(conn: NewConnection): Promise<Connection>
    update(conn: Connection): Promise<Connection>
    delete(id: string): Promise<void>
    test(conn: NewConnection): Promise<TestResult>
  }
  ssh: {
    connect(connectionId: string): Promise<ConnectResult>
    disconnect(sessionId: string): Promise<void>
    onDisconnected(cb: (sessionId: string) => void): void
  }
  sftp: {
    listDir(sessionId: string, path: string): Promise<FileNode[]>
    readFile(sessionId: string, remotePath: string): Promise<ReadFileResult>
    writeFile(sessionId: string, remotePath: string, content: string): Promise<void>
    rename(sessionId: string, oldPath: string, newPath: string): Promise<void>
    mkdir(sessionId: string, path: string): Promise<void>
    delete(sessionId: string, path: string): Promise<void>
    deleteRecursive(sessionId: string, path: string): Promise<void>
    createFile(sessionId: string, path: string): Promise<void>
    openUploadDialog(mode: 'files' | 'folder'): Promise<string[] | null>
    uploadFiles(sessionId: string, targetDir: string, localPaths: string[]): Promise<void>
    onUploadProgress(callback: (event: UploadProgressEvent) => void): () => void
  }
  terminal: {
    create(sessionId: string, cols: number, rows: number): Promise<string>
    sendInput(termId: string, data: string): void
    resize(termId: string, cols: number, rows: number): void
    close(termId: string): Promise<void>
    onOutput(cb: (termId: string, data: string) => void): void
  }
}
