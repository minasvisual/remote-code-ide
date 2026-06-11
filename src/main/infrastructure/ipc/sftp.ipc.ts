import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync, appendFileSync, promises as fsp } from 'fs'
import chardet from 'chardet'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { TempFileManager } from '../../adapters/temp/TempFileManager'
import { basename, join, dirname, relative } from 'path'
import { tmpdir } from 'os'

const MAX_FILE_SIZE = 5 * 1024 * 1024

interface UploadProgressPayload {
  localPath: string
  remoteName: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

async function collectUploadEntries(
  localPath: string,
  base: string
): Promise<Array<{ filePath: string; relativePath: string }>> {
  const entries: Array<{ filePath: string; relativePath: string }> = []
  const stack = [localPath]
  while (stack.length > 0) {
    const current = stack.pop()!
    const stat = await fsp.stat(current)
    if (stat.isDirectory()) {
      const names = await fsp.readdir(current)
      for (const name of names) stack.push(join(current, name))
    } else {
      entries.push({ filePath: current, relativePath: relative(base, current).replace(/\\/g, '/') })
    }
  }
  return entries
}
const LOG_FILE = join(tmpdir(), 'remotecodeide-debug.log')

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] [IPC] ${msg}\n`
  console.log(line.trim())
  try { appendFileSync(LOG_FILE, line) } catch {}
}

export function registerSftpIpc(sftp: ISftpService, tempFiles: TempFileManager): void {
  ipcMain.handle('sftp:listDir', (_e, sessionId: string, path: string) =>
    sftp.listDir(sessionId, path)
  )

  ipcMain.handle('sftp:readFile', async (_e, sessionId: string, remotePath: string) => {
    log(`sftp:readFile received — session=${sessionId.slice(0, 8)} path=${remotePath}`)

    const buffer = await sftp.readFile(sessionId, remotePath).catch((err: Error) => {
      log(`sftp:readFile failed — ${err.message}`)
      throw err
    })

    log(`sftp:readFile — buffer ready, ${buffer.length} bytes`)

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File is too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Max allowed: 5 MB`
      )
    }

    const filename = basename(remotePath)
    const localTempPath = tempFiles.createTempPath(sessionId, filename)
    log(`sftp:readFile — writing to temp: ${localTempPath}`)

    writeFileSync(localTempPath, buffer)

    const encoding = chardet.detect(buffer) ?? 'UTF-8'
    const content = buffer.toString(
      encoding.toLowerCase().replace('-', '') === 'utf8' ? 'utf8' : 'latin1'
    )

    log(`sftp:readFile — done, encoding=${encoding}`)
    return { localTempPath, content }
  })

  ipcMain.handle(
    'sftp:writeFile',
    (_e, sessionId: string, remotePath: string, content: string) =>
      sftp.writeFile(sessionId, remotePath, Buffer.from(content, 'utf8'))
  )

  ipcMain.handle(
    'sftp:rename',
    (_e, sessionId: string, oldPath: string, newPath: string) =>
      sftp.rename(sessionId, oldPath, newPath)
  )

  ipcMain.handle('sftp:mkdir', (_e, sessionId: string, path: string) =>
    sftp.mkdir(sessionId, path)
  )

  ipcMain.handle('sftp:delete', (_e, sessionId: string, path: string) =>
    sftp.delete(sessionId, path)
  )

  ipcMain.handle('sftp:deleteRecursive', (_e, sessionId: string, path: string) =>
    sftp.deleteRecursive(sessionId, path)
  )

  ipcMain.handle('sftp:createFile', async (_e, sessionId: string, path: string) => {
    try {
      await sftp.createFile(sessionId, path)
      return { success: true }
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      return { success: false, code: e.code, error: e.message }
    }
  })

  ipcMain.handle('sftp:openUploadDialog', async (_e, mode: 'files' | 'folder') => {
    const win = BrowserWindow.fromWebContents(_e.sender) ?? BrowserWindow.getFocusedWindow()
    if (!win) return null
    const properties: Electron.OpenDialogOptions['properties'] =
      mode === 'folder'
        ? ['openDirectory', 'multiSelections']
        : ['openFile', 'multiSelections']
    const result = await dialog.showOpenDialog(win, { properties })
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle(
    'sftp:uploadFiles',
    async (_e, { sessionId, targetDir, localPaths }: { sessionId: string; targetDir: string; localPaths: string[] }) => {
      const sender = _e.sender
      const sendProgress = (payload: UploadProgressPayload) => {
        try { sender.send('sftp:uploadProgress', payload) } catch {}
      }

      const allEntries: Array<{ filePath: string; relativePath: string }> = []
      for (const localPath of localPaths) {
        const base = dirname(localPath)
        const entries = await collectUploadEntries(localPath, base)
        allEntries.push(...entries)
      }

      for (const { filePath, relativePath } of allEntries) {
        sendProgress({ localPath: filePath, remoteName: relativePath, status: 'pending' })
      }

      for (const { filePath, relativePath } of allEntries) {
        const remotePath = targetDir === '/' ? `/${relativePath}` : `${targetDir}/${relativePath}`
        const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/'
        sendProgress({ localPath: filePath, remoteName: relativePath, status: 'uploading' })
        try {
          await sftp.mkdirp(sessionId, remoteDir)
          const content = await fsp.readFile(filePath)
          await sftp.writeFile(sessionId, remotePath, content)
          sendProgress({ localPath: filePath, remoteName: relativePath, status: 'done' })
        } catch (err: unknown) {
          const error = (err as Error).message
          sendProgress({ localPath: filePath, remoteName: relativePath, status: 'error', error })
        }
      }
    }
  )
}
