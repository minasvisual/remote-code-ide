import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { Ssh2Client } from '../../adapters/ssh/Ssh2Client'
import type { ClientChannel } from 'ssh2'

const terminals = new Map<string, ClientChannel>()

export function registerTerminalIpc(sshClient: Ssh2Client): void {
  ipcMain.handle(
    'terminal:create',
    async (_e, sessionId: string, cols: number, rows: number) => {
      const client = sshClient.getClient(sessionId)
      const termId = uuidv4()

      const stream = await new Promise<ClientChannel>((resolve, reject) => {
        client.shell({ term: 'xterm-256color', cols, rows }, (err, s) => {
          if (err) reject(err)
          else resolve(s)
        })
      })

      terminals.set(termId, stream)

      stream.on('data', (data: Buffer) => {
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send('terminal:output', termId, data.toString())
        })
      })

      stream.stderr?.on('data', (data: Buffer) => {
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send('terminal:output', termId, data.toString())
        })
      })

      stream.on('close', () => {
        terminals.delete(termId)
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send('terminal:output', termId, '\r\n[Session closed]\r\n')
        })
      })

      return termId
    }
  )

  ipcMain.on('terminal:input', (_e, termId: string, data: string) => {
    terminals.get(termId)?.write(data)
  })

  ipcMain.on('terminal:resize', (_e, termId: string, cols: number, rows: number) => {
    const stream = terminals.get(termId)
    if (stream) (stream as ClientChannel & { setWindow(r: number, c: number): void }).setWindow?.(rows, cols)
  })

  ipcMain.handle('terminal:close', (_e, termId: string) => {
    const stream = terminals.get(termId)
    if (stream) { stream.end(); terminals.delete(termId) }
  })
}
