import { contextBridge, ipcRenderer } from 'electron'
import type { IRemoteApi, UploadProgressEvent, DownloadProgressEvent, SearchProgressEvent } from '../renderer/domain/ports/IRemoteApi'

const api: IRemoteApi = {
  connections: {
    list: () => ipcRenderer.invoke('connections:list'),
    save: (conn) => ipcRenderer.invoke('connections:save', conn),
    update: (conn) => ipcRenderer.invoke('connections:update', conn),
    delete: (id) => ipcRenderer.invoke('connections:delete', id),
    test: (conn) => ipcRenderer.invoke('connections:test', conn)
  },
  ssh: {
    connect: (id) => ipcRenderer.invoke('ssh:connect', id),
    disconnect: (sessionId) => ipcRenderer.invoke('ssh:disconnect', sessionId),
    onDisconnected: (cb) => {
      ipcRenderer.on('ssh:disconnected', (_e, sessionId) => cb(sessionId))
    }
  },
  sftp: {
    listDir: (sessionId, path) => ipcRenderer.invoke('sftp:listDir', sessionId, path),
    getFileInfo: async (sessionId, path) => {
      const result = await ipcRenderer.invoke('sftp:getFileInfo', sessionId, path)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result.data
    },
    readFile: (sessionId, remotePath) => ipcRenderer.invoke('sftp:readFile', sessionId, remotePath),
    writeFile: (sessionId, remotePath, content) =>
      ipcRenderer.invoke('sftp:writeFile', sessionId, remotePath, content),
    rename: (sessionId, oldPath, newPath) =>
      ipcRenderer.invoke('sftp:rename', sessionId, oldPath, newPath),
    mkdir: (sessionId, path) => ipcRenderer.invoke('sftp:mkdir', sessionId, path),
    delete: (sessionId, path) => ipcRenderer.invoke('sftp:delete', sessionId, path),
    deleteRecursive: (sessionId, path) => ipcRenderer.invoke('sftp:deleteRecursive', sessionId, path),
    createFile: async (sessionId, path) => {
      const result = await ipcRenderer.invoke('sftp:createFile', sessionId, path)
      if (!result.success) {
        throw Object.assign(new Error(result.error), { code: result.code })
      }
    },
    openUploadDialog: (mode) => ipcRenderer.invoke('sftp:openUploadDialog', mode),
    uploadFiles: (sessionId, targetDir, localPaths) =>
      ipcRenderer.invoke('sftp:uploadFiles', { sessionId, targetDir, localPaths }),
    onUploadProgress: (callback) => {
      const listener = (_e: Electron.IpcRendererEvent, event: UploadProgressEvent) => callback(event)
      ipcRenderer.on('sftp:uploadProgress', listener)
      return () => ipcRenderer.removeListener('sftp:uploadProgress', listener)
    },
    openSaveDialog: (mode, suggestedName) =>
      ipcRenderer.invoke('sftp:openSaveDialog', { mode, suggestedName }),
    downloadFile: async (sessionId, remotePath, localPath) => {
      const result = await ipcRenderer.invoke('sftp:downloadFile', sessionId, remotePath, localPath)
      return { transferId: result.transferId }
    },
    downloadFolder: async (sessionId, remotePath, localPath) => {
      const result = await ipcRenderer.invoke('sftp:downloadFolder', sessionId, remotePath, localPath)
      return { transferId: result.transferId }
    },
    onDownloadProgress: (callback) => {
      const listener = (_e: Electron.IpcRendererEvent, event: DownloadProgressEvent) => callback(event)
      ipcRenderer.on('sftp:downloadProgress', listener)
      return () => ipcRenderer.removeListener('sftp:downloadProgress', listener)
    },
    cancelDownload: (transferId) => ipcRenderer.invoke('sftp:cancelDownload', transferId),
    copy: async (sessionId, sourcePath, destPath, type, overwrite) => {
      const result = await ipcRenderer.invoke('sftp:copy', sessionId, sourcePath, destPath, type, overwrite)
      if (!result.success) {
        throw Object.assign(new Error(result.error), { code: result.code })
      }
    },
    searchInFolder: async (sessionId, rootPath, query) => {
      const result = await ipcRenderer.invoke('sftp:searchInFolder', sessionId, rootPath, query)
      return { searchId: result.searchId }
    },
    onSearchProgress: (callback) => {
      const listener = (_e: Electron.IpcRendererEvent, event: SearchProgressEvent) => callback(event)
      ipcRenderer.on('sftp:searchProgress', listener)
      return () => ipcRenderer.removeListener('sftp:searchProgress', listener)
    },
    cancelSearch: (searchId) => ipcRenderer.invoke('sftp:cancelSearch', searchId)
  },
  terminal: {
    create: (sessionId, cols, rows, initialDir) =>
      ipcRenderer.invoke('terminal:create', sessionId, cols, rows, initialDir),
    sendInput: (termId, data) => ipcRenderer.send('terminal:input', termId, data),
    resize: (termId, cols, rows) => ipcRenderer.send('terminal:resize', termId, cols, rows),
    close: (termId) => ipcRenderer.invoke('terminal:close', termId),
    onOutput: (cb) => {
      ipcRenderer.on('terminal:output', (_e, termId, data) => cb(termId, data))
    }
  },
  versions: {
    node: process.versions.node,
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? ''
  }
}

contextBridge.exposeInMainWorld('api', api)
