import { ipcMain } from 'electron'
import type { IConnectionRepo } from '../../domain/ports/IConnectionRepo'
import type { ISshClient } from '../../domain/ports/ISshClient'
import type { ICryptoService } from '../../domain/ports/ICryptoService'
import type { NewConnection } from '../../domain/entities/Connection'

export function registerConnectionsIpc(
  repo: IConnectionRepo,
  sshClient: ISshClient,
  crypto: ICryptoService
): void {
  ipcMain.handle('connections:list', () => repo.list())

  ipcMain.handle('connections:save', (_e, conn: NewConnection) => repo.save(conn))

  ipcMain.handle('connections:update', (_e, conn) => repo.update(conn))

  ipcMain.handle('connections:delete', (_e, id: string) => repo.delete(id))

  ipcMain.handle('connections:test', async (_e, conn: NewConnection) => {
    return sshClient.test({
      connection: {
        id: '',
        label: conn.label,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        authType: conn.authType,
        createdAt: '',
        updatedAt: ''
      },
      plainPassword: conn.plainPassword,
      plainPrivateKey: conn.plainPrivateKey
    })
  })
}
