import { contextBridge, ipcRenderer } from 'electron'
import type {
  IRemoteApi,
  UploadProgressEvent,
  DownloadProgressEvent,
  SearchProgressEvent,
  AiChatChunkEvent,
  AiToolCallPendingEvent,
  AiToolCallResultEvent
} from '../renderer/domain/ports/IRemoteApi'

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
  extensions: {
    install: async (namespace, name, version) => {
      const result = await ipcRenderer.invoke('extensions:install', namespace, name, version)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    list: async () => {
      const result = await ipcRenderer.invoke('extensions:list')
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    uninstall: async (id) => {
      const result = await ipcRenderer.invoke('extensions:uninstall', id)
      if (!result.success) throw new Error(result.error)
    },
    setEnabled: async (id, enabled) => {
      const result = await ipcRenderer.invoke('extensions:setEnabled', id, enabled)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    readThemeFile: async (id) => {
      const result = await ipcRenderer.invoke('extensions:readThemeFile', id)
      if (!result.success) throw new Error(result.error)
      return result.data
    }
  },
  ai: {
    providers: {
      list: async () => {
        const result = await ipcRenderer.invoke('ai:providers:list')
        if (!result.success) throw new Error(result.error)
        return result.data
      },
      save: async (config) => {
        const result = await ipcRenderer.invoke('ai:providers:save', config)
        if (!result.success) throw new Error(result.error)
        return result.data
      },
      update: async (config) => {
        const result = await ipcRenderer.invoke('ai:providers:update', config)
        if (!result.success) throw new Error(result.error)
        return result.data
      },
      delete: async (id) => {
        const result = await ipcRenderer.invoke('ai:providers:delete', id)
        if (!result.success) throw new Error(result.error)
      },
      setDefault: async (id) => {
        const result = await ipcRenderer.invoke('ai:providers:setDefault', id)
        if (!result.success) throw new Error(result.error)
      },
      test: async (config) => {
        const result = await ipcRenderer.invoke('ai:providers:test', config)
        return result.success
          ? { success: true, message: 'Connection successful' }
          : { success: false, message: result.error }
      },
      supportsTools: async () => {
        const result = await ipcRenderer.invoke('ai:providers:supportsTools')
        if (!result.success) throw new Error(result.error)
        return result.data
      }
    },
    chat: {
      send: async (messages, fileContext, agentOptions) =>
        ipcRenderer.invoke('ai:chat:send', messages, fileContext, agentOptions),
      onChunk: (callback) => {
        const listener = (_e: Electron.IpcRendererEvent, event: AiChatChunkEvent) => callback(event)
        ipcRenderer.on('ai:chat:chunk', listener)
        return () => ipcRenderer.removeListener('ai:chat:chunk', listener)
      },
      cancel: (chatId) => ipcRenderer.invoke('ai:chat:cancel', chatId),
      onToolCallPending: (callback) => {
        const listener = (_e: Electron.IpcRendererEvent, event: AiToolCallPendingEvent) => callback(event)
        ipcRenderer.on('ai:chat:toolCallPending', listener)
        return () => ipcRenderer.removeListener('ai:chat:toolCallPending', listener)
      },
      onToolCallResult: (callback) => {
        const listener = (_e: Electron.IpcRendererEvent, event: AiToolCallResultEvent) => callback(event)
        ipcRenderer.on('ai:chat:toolCallResult', listener)
        return () => ipcRenderer.removeListener('ai:chat:toolCallResult', listener)
      },
      approveTool: (callId) => ipcRenderer.invoke('ai:chat:approveTool', callId),
      denyTool: (callId) => ipcRenderer.invoke('ai:chat:denyTool', callId)
    }
  },
  versions: {
    node: process.versions.node,
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? ''
  }
}

contextBridge.exposeInMainWorld('api', api)
