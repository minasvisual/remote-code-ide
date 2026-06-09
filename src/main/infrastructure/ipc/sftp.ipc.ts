import { ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import chardet from 'chardet'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { TempFileManager } from '../../adapters/temp/TempFileManager'
import { basename } from 'path'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export function registerSftpIpc(sftp: ISftpService, tempFiles: TempFileManager): void {
  ipcMain.handle('sftp:listDir', (_e, sessionId: string, path: string) =>
    sftp.listDir(sessionId, path)
  )

  ipcMain.handle('sftp:readFile', async (_e, sessionId: string, remotePath: string) => {
    const nodes = await sftp.listDir(sessionId, remotePath.split('/').slice(0, -1).join('/') || '/')
    const node = nodes.find((n) => n.path === remotePath)

    if (node && node.size > MAX_FILE_SIZE) {
      throw new Error(
        `File is too large (${(node.size / 1024 / 1024).toFixed(1)} MB). Max allowed: 5 MB`
      )
    }

    const buffer = await sftp.readFile(sessionId, remotePath)
    const filename = basename(remotePath)
    const localTempPath = tempFiles.createTempPath(sessionId, filename)

    writeFileSync(localTempPath, buffer)

    const encoding = chardet.detect(buffer) ?? 'UTF-8'
    const content = buffer.toString(
      encoding.toLowerCase().replace('-', '') === 'utf8' ? 'utf8' : 'latin1'
    )

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
