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

export interface DownloadProgressEvent {
  transferId: string
  transferred: number
  total?: number
  status: 'downloading' | 'done' | 'error' | 'cancelled'
  error?: string
}

export interface DownloadResult {
  transferId: string
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

export interface SearchProgressEvent {
  searchId: string
  type: 'match' | 'done' | 'error' | 'cancelled'
  result?: SearchFileMatch
  error?: string
}

export interface SearchResult {
  searchId: string
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
    getFileInfo(sessionId: string, path: string): Promise<FileInfo>
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
    openSaveDialog(mode: 'file' | 'folder', suggestedName: string): Promise<string | null>
    downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<DownloadResult>
    downloadFolder(sessionId: string, remotePath: string, localPath: string): Promise<DownloadResult>
    onDownloadProgress(callback: (event: DownloadProgressEvent) => void): () => void
    cancelDownload(transferId: string): Promise<void>
    copy(
      sessionId: string,
      sourcePath: string,
      destPath: string,
      type: 'file' | 'directory',
      overwrite?: boolean
    ): Promise<void>
    searchInFolder(sessionId: string, rootPath: string, query: string): Promise<SearchResult>
    onSearchProgress(callback: (event: SearchProgressEvent) => void): () => void
    cancelSearch(searchId: string): Promise<void>
  }
  terminal: {
    create(sessionId: string, cols: number, rows: number, initialDir?: string): Promise<string>
    sendInput(termId: string, data: string): void
    resize(termId: string, cols: number, rows: number): void
    close(termId: string): Promise<void>
    onOutput(cb: (termId: string, data: string) => void): void
  }
  versions: {
    node: string
    electron: string
    chrome: string
  }
}
