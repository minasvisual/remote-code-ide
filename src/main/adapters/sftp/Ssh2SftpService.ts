import type { SFTPWrapper } from 'ssh2'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { FileNode } from '../../domain/entities/FileNode'
import type { Ssh2Client } from '../ssh/Ssh2Client'

export class Ssh2SftpService implements ISftpService {
  constructor(private sshClient: Ssh2Client) {}

  private getSftp(sessionId: string): Promise<SFTPWrapper> {
    const client = this.sshClient.getClient(sessionId)
    return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
        if (err) reject(err)
        else resolve(sftp)
      })
    })
  }

  async listDir(sessionId: string, path: string): Promise<FileNode[]> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        sftp.end()
        if (err) { reject(err); return }

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

        resolve(nodes)
      })
    })
  }

  async readFile(sessionId: string, remotePath: string): Promise<Buffer> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = sftp.createReadStream(remotePath)
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => { sftp.end(); resolve(Buffer.concat(chunks)) })
      stream.on('error', (err: Error) => { sftp.end(); reject(err) })
    })
  }

  async writeFile(sessionId: string, remotePath: string, content: Buffer): Promise<void> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(remotePath)
      stream.on('close', () => { sftp.end(); resolve() })
      stream.on('error', (err: Error) => { sftp.end(); reject(err) })
      stream.end(content)
    })
  }

  async rename(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err: Error | null | undefined) => {
        sftp.end()
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async mkdir(sessionId: string, path: string): Promise<void> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.mkdir(path, (err: Error | null | undefined) => {
        sftp.end()
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async delete(sessionId: string, path: string): Promise<void> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      sftp.unlink(path, (err) => {
        sftp.end()
        if (err) reject(err)
        else resolve()
      })
    })
  }
}
