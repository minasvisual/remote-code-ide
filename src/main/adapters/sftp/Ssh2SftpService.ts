import type { SFTPWrapper } from 'ssh2'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { FileNode } from '../../domain/entities/FileNode'
import type { Ssh2Client } from '../ssh/Ssh2Client'
import { appendFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const LOG_FILE = join(tmpdir(), 'mycodeany-debug.log')

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] [SFTP] ${msg}\n`
  console.log(line.trim())
  try { appendFileSync(LOG_FILE, line) } catch {}
}

export class Ssh2SftpService implements ISftpService {
  private sftpSessions = new Map<string, SFTPWrapper>()

  constructor(private sshClient: Ssh2Client) {
    sshClient.onDisconnected((sessionId) => this.closeSession(sessionId))
  }

  private closeSession(sessionId: string): void {
    const sftp = this.sftpSessions.get(sessionId)
    if (sftp) {
      log(`closeSession(${sessionId.slice(0, 8)}) → ending persistent SFTP session`)
      try { sftp.end() } catch {}
      this.sftpSessions.delete(sessionId)
    }
  }

  private getSftp(sessionId: string): Promise<SFTPWrapper> {
    const cached = this.sftpSessions.get(sessionId)
    if (cached) {
      log(`getSftp(${sessionId.slice(0, 8)}) → reusing cached session`)
      return Promise.resolve(cached)
    }

    if (!this.sshClient.isConnected(sessionId)) {
      const err = new Error(`Session ${sessionId.slice(0, 8)} is not connected`)
      log(`getSftp → ${err.message}`)
      return Promise.reject(err)
    }

    log(`getSftp(${sessionId.slice(0, 8)}) → opening new SFTP subsystem`)
    const client = this.sshClient.getClient(sessionId)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        log(`getSftp(${sessionId.slice(0, 8)}) → TIMEOUT after 30s — client.sftp() never called back`)
        reject(new Error('SFTP subsystem request timed out after 30 seconds'))
      }, 30000)

      client.sftp((err, sftp) => {
        clearTimeout(timeout)
        if (err) {
          log(`getSftp(${sessionId.slice(0, 8)}) → error opening subsystem: ${err.message}`)
          reject(err)
          return
        }

        log(`getSftp(${sessionId.slice(0, 8)}) → subsystem opened OK`)

        const cleanup = (reason: string) => () => {
          log(`getSftp(${sessionId.slice(0, 8)}) → session ${reason}, removing from cache`)
          this.sftpSessions.delete(sessionId)
        }
        sftp.on('error', (e: Error) => {
          log(`SFTP session(${sessionId.slice(0, 8)}) error: ${e.message}`)
          this.sftpSessions.delete(sessionId)
        })
        sftp.on('close', cleanup('closed'))
        sftp.on('end', cleanup('ended'))

        this.sftpSessions.set(sessionId, sftp)
        resolve(sftp)
      })
    })
  }

  async listDir(sessionId: string, path: string): Promise<FileNode[]> {
    log(`listDir(${sessionId.slice(0, 8)}, ${path})`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) {
          log(`listDir error: ${err.message}`)
          reject(err)
          return
        }

        const nodes: FileNode[] = list.map((entry) => {
          const isDir = (entry.attrs.mode & 0o170000) === 0o040000
          const isLink = (entry.attrs.mode & 0o170000) === 0o120000
          return {
            name: entry.filename,
            path: path === '/' ? `/${entry.filename}` : `${path}/${entry.filename}`,
            type: isDir ? 'directory' : isLink ? 'symlink' : 'file',
            size: entry.attrs.size ?? 0,
            modifiedAt: entry.attrs.mtime
              ? new Date(entry.attrs.mtime * 1000).toISOString()
              : '',
            permissions: (entry.attrs.mode ?? 0).toString(8),
            isLoaded: false
          }
        })

        nodes.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1
          if (a.type !== 'directory' && b.type === 'directory') return 1
          return a.name.localeCompare(b.name)
        })

        log(`listDir(${sessionId.slice(0, 8)}, ${path}) → ${nodes.length} entries`)
        resolve(nodes)
      })
    })
  }

  async readFile(sessionId: string, remotePath: string): Promise<Buffer> {
    log(`readFile(${sessionId.slice(0, 8)}, ${remotePath})`)
    const sftp = await this.getSftp(sessionId)
    log(`readFile → got sftp session, creating read stream`)
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      let settled = false
      const settle = (fn: () => void) => {
        if (!settled) { settled = true; fn() }
      }
      const stream = sftp.createReadStream(remotePath)
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })
      stream.on('end', () => {
        const total = chunks.reduce((s, c) => s + c.length, 0)
        log(`readFile stream end — ${total} bytes`)
        settle(() => resolve(Buffer.concat(chunks)))
      })
      stream.on('error', (err: Error) => {
        log(`readFile stream error: ${err.message}`)
        settle(() => reject(err))
      })
      stream.on('close', () => {
        const total = chunks.reduce((s, c) => s + c.length, 0)
        log(`readFile stream close — ${total} bytes`)
        settle(() => resolve(Buffer.concat(chunks)))
      })
    })
  }

  async writeFile(sessionId: string, remotePath: string, content: Buffer): Promise<void> {
    log(`writeFile(${sessionId.slice(0, 8)}, ${remotePath}, ${content.length} bytes)`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(remotePath)
      stream.on('close', () => {
        log(`writeFile close — done`)
        resolve()
      })
      stream.on('error', (err: Error) => {
        log(`writeFile error: ${err.message}`)
        reject(err)
      })
      stream.end(content)
    })
  }

  async rename(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    log(`rename(${sessionId.slice(0, 8)}, ${oldPath} → ${newPath})`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err: Error | null | undefined) => {
        if (err) { log(`rename error: ${err.message}`); reject(err) }
        else resolve()
      })
    })
  }

  async mkdir(sessionId: string, path: string): Promise<void> {
    log(`mkdir(${sessionId.slice(0, 8)}, ${path})`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.mkdir(path, (err: Error | null | undefined) => {
        if (err) { log(`mkdir error: ${err.message}`); reject(err) }
        else resolve()
      })
    })
  }

  async delete(sessionId: string, path: string): Promise<void> {
    log(`delete(${sessionId.slice(0, 8)}, ${path})`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.unlink(path, (err) => {
        if (err) { log(`delete error: ${err.message}`); reject(err) }
        else resolve()
      })
    })
  }
}
