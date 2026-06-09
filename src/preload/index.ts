import { contextBridge, ipcRenderer } from 'electron'
import type { IRemoteApi } from '../renderer/domain/ports/IRemoteApi'

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
    readFile: (sessionId, remotePath) => ipcRenderer.invoke('sftp:readFile', sessionId, remotePath),
    writeFile: (sessionId, remotePath, content) =>
      ipcRenderer.invoke('sftp:writeFile', sessionId, remotePath, content),
    rename: (sessionId, oldPath, newPath) =>
      ipcRenderer.invoke('sftp:rename', sessionId, oldPath, newPath),
    mkdir: (sessionId, path) => ipcRenderer.invoke('sftp:mkdir', sessionId, path),
    delete: (sessionId, path) => ipcRenderer.invoke('sftp:delete', sessionId, path)
  },
  terminal: {
    create: (sessionId, cols, rows) =>
      ipcRenderer.invoke('terminal:create', sessionId, cols, rows),
    sendInput: (termId, data) => ipcRenderer.send('terminal:input', termId, data),
    resize: (termId, cols, rows) => ipcRenderer.send('terminal:resize', termId, cols, rows),
    close: (termId) => ipcRenderer.invoke('terminal:close', termId),
    onOutput: (cb) => {
      ipcRenderer.on('terminal:output', (_e, termId, data) => cb(termId, data))
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
