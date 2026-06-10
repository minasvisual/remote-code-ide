import { ipcMain } from 'electron'
import { writeFileSync, appendFileSync } from 'fs'
import chardet from 'chardet'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { TempFileManager } from '../../adapters/temp/TempFileManager'
import { basename, join } from 'path'
import { tmpdir } from 'os'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const LOG_FILE = join(tmpdir(), 'mycodeany-debug.log')

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
}
