import { app, BrowserWindow, session, globalShortcut } from 'electron'
import { join } from 'path'
import { SafeStorageCrypto } from './adapters/crypto/SafeStorageCrypto'
import { ElectronStoreConnectionRepo } from './adapters/storage/ElectronStoreConnectionRepo'
import { Ssh2Client } from './adapters/ssh/Ssh2Client'
import { Ssh2SftpService } from './adapters/sftp/Ssh2SftpService'
import { TempFileManager } from './adapters/temp/TempFileManager'
import { registerConnectionsIpc } from './infrastructure/ipc/connections.ipc'
import { registerSshIpc } from './infrastructure/ipc/ssh.ipc'
import { registerSftpIpc } from './infrastructure/ipc/sftp.ipc'
import { registerTerminalIpc } from './infrastructure/ipc/terminal.ipc'

const crypto = new SafeStorageCrypto()
const repo = new ElectronStoreConnectionRepo(crypto)
const sshClient = new Ssh2Client()
const sftpService = new Ssh2SftpService(sshClient)
const tempFiles = new TempFileManager()

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.setMenuBarVisibility(false)

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (process.env['OPEN_DEVTOOLS']) {
    win.webContents.openDevTools()
  }

  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      win.webContents.toggleDevTools()
    }
  })
}

function setupCsp(): void {
  // Skip CSP in dev mode — Vite injects inline scripts for HMR that would be blocked.
  // In production the app loads from file:// where CSP is meaningful.
  if (process.env['ELECTRON_RENDERER_URL']) return

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; worker-src blob: 'self'; connect-src 'self' wss: ws: https:; img-src 'self' data: blob:"
        ]
      }
    })
  })
}

app.whenReady().then(() => {
  setupCsp()

  registerConnectionsIpc(repo, sshClient, crypto)
  registerSshIpc(sshClient, repo, crypto, tempFiles)
  registerSftpIpc(sftpService, tempFiles)
  registerTerminalIpc(sshClient)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => tempFiles.cleanAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
