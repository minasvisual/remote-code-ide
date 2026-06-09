import { ipcMain, BrowserWindow } from 'electron'
import type { Ssh2Client } from '../../adapters/ssh/Ssh2Client'
import type { IConnectionRepo } from '../../domain/ports/IConnectionRepo'
import type { ICryptoService } from '../../domain/ports/ICryptoService'
import type { TempFileManager } from '../../adapters/temp/TempFileManager'

export function registerSshIpc(
  sshClient: Ssh2Client,
  repo: IConnectionRepo,
  crypto: ICryptoService,
  tempFiles: TempFileManager
): void {
  sshClient.onDisconnected((sessionId) => {
    tempFiles.deleteSessionFiles(sessionId)
    BrowserWindow.getAllWindows().forEach((w) => {
      w.webContents.send('ssh:disconnected', sessionId)
    })
  })

  ipcMain.handle('ssh:connect', async (_e, connectionId: string) => {
    try {
      const connection = await repo.get(connectionId)
      const plainPassword =
        connection.encryptedPassword ? crypto.decrypt(connection.encryptedPassword) : undefined
      const plainPrivateKey =
        connection.encryptedPrivateKey ? crypto.decrypt(connection.encryptedPrivateKey) : undefined

      const sessionId = await sshClient.connect({ connection, plainPassword, plainPrivateKey })
      return { success: true, sessionId }
    } catch (err: unknown) {
      return { success: false, sessionId: '', message: (err as Error).message }
    }
  })

  ipcMain.handle('ssh:disconnect', async (_e, sessionId: string) => {
    tempFiles.deleteSessionFiles(sessionId)
    await sshClient.disconnect(sessionId)
  })
}
