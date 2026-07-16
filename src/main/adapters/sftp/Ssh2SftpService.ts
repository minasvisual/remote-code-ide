import type { SFTPWrapper } from 'ssh2'
import type { ISftpService, DownloadOptions, FileInfo, SearchOptions, SearchFileMatch, SearchLineMatch } from '../../domain/ports/ISftpService'
import type { FileNode } from '../../domain/entities/FileNode'
import type { Ssh2Client } from '../ssh/Ssh2Client'
import { appendFileSync, createWriteStream, promises as fsp } from 'fs'
import { basename, join } from 'path'
import { tmpdir } from 'os'
import archiver from 'archiver'

const MAX_SEARCH_FILE_SIZE = 2 * 1024 * 1024
const MAX_REPORTED_MATCHES_PER_FILE = 10
const MAX_MATCH_TEXT_LENGTH = 200

function cancelledError(): Error {
  return Object.assign(new Error('Download cancelled'), { code: 'CANCELLED' })
}

function cancelledSearchError(): Error {
  return Object.assign(new Error('Search cancelled'), { code: 'CANCELLED' })
}

const LOG_FILE = join(tmpdir(), 'remotecodeide-debug.log')

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

  async getFileInfo(sessionId: string, path: string): Promise<FileInfo> {
    log(`getFileInfo(${sessionId.slice(0, 8)}, ${path})`)
    const sftp = await this.getSftp(sessionId)
    const stats = await new Promise<import('ssh2').Stats>((resolve, reject) => {
      sftp.stat(path, (err, stats) => {
        if (err) {
          log(`getFileInfo stat error: ${err.message}`)
          reject(err)
        } else {
          resolve(stats)
        }
      })
    })

    const mode = stats.mode ?? 0
    const isDir = (mode & 0o170000) === 0o040000
    const isLink = (mode & 0o170000) === 0o120000
    const type: FileInfo['type'] = isDir ? 'directory' : isLink ? 'symlink' : 'file'

    const info: FileInfo = {
      name: basename(path) || path,
      path,
      type,
      size: stats.size ?? 0,
      permissions: mode.toString(8),
      owner: stats.uid ?? 0,
      group: stats.gid ?? 0,
      modifiedAt: stats.mtime ? new Date(stats.mtime * 1000).toISOString() : '',
      accessedAt: stats.atime ? new Date(stats.atime * 1000).toISOString() : ''
    }

    if (type === 'directory') {
      const entries = await this.listDir(sessionId, path)
      info.itemCount = entries.length
    }

    if (type === 'symlink') {
      info.symlinkTarget = await new Promise<string | undefined>((resolve) => {
        sftp.readlink(path, (err, target) => {
          resolve(err ? undefined : target)
        })
      })
    }

    log(`getFileInfo(${sessionId.slice(0, 8)}, ${path}) → type=${type}`)
    return info
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

  async createFile(sessionId: string, path: string): Promise<void> {
    log(`createFile(${sessionId.slice(0, 8)}, ${path})`)
    const sftp = await this.getSftp(sessionId)
    await new Promise<void>((resolve, reject) => {
      sftp.stat(path, (err) => {
        if (!err) {
          const exists = Object.assign(new Error('File already exists'), { code: 'FILE_EXISTS' })
          reject(exists)
        } else {
          resolve()
        }
      })
    })
    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(path)
      stream.on('close', () => { log(`createFile close — done`); resolve() })
      stream.on('error', (err: Error) => { log(`createFile error: ${err.message}`); reject(err) })
      stream.end(Buffer.alloc(0))
    })
  }

  async uploadFile(sessionId: string, remotePath: string, content: Buffer): Promise<void> {
    return this.writeFile(sessionId, remotePath, content)
  }

  async mkdirp(sessionId: string, path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    let current = ''
    for (const part of parts) {
      current += '/' + part
      try {
        await this.mkdir(sessionId, current)
      } catch (err: unknown) {
        const e = err as { code?: string | number; message?: string }
        const msg = String(e.message ?? '').toLowerCase()
        if (e.code !== 4 && !msg.includes('exist') && !msg.includes('eexist')) {
          throw err
        }
      }
    }
  }

  async deleteRecursive(sessionId: string, path: string): Promise<void> {
    log(`deleteRecursive(${sessionId.slice(0, 8)}, ${path})`)
    const entries = await this.listDir(sessionId, path)
    for (const entry of entries) {
      if (entry.type === 'directory') {
        await this.deleteRecursive(sessionId, entry.path)
      } else {
        await this.delete(sessionId, entry.path)
      }
    }
    const sftp = await this.getSftp(sessionId)
    await new Promise<void>((resolve, reject) => {
      sftp.rmdir(path, (err) => {
        if (err) { log(`deleteRecursive rmdir error: ${err.message}`); reject(err) }
        else resolve()
      })
    })
  }

  async downloadFile(
    sessionId: string,
    remotePath: string,
    localPath: string,
    options: DownloadOptions
  ): Promise<void> {
    const { signal, onProgress } = options
    log(`downloadFile(${sessionId.slice(0, 8)}, ${remotePath} → ${localPath})`)
    const sftp = await this.getSftp(sessionId)
    const stats = await this.statSafe(sessionId, remotePath)
    const total = stats?.size

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false
        let aborted = false
        let transferred = 0
        const settle = (fn: () => void) => {
          if (!settled) { settled = true; fn() }
        }
        const readStream = sftp.createReadStream(remotePath)
        const writeStream = createWriteStream(localPath)

        const onAbort = () => {
          log(`downloadFile aborted`)
          aborted = true
          readStream.destroy()
          writeStream.destroy()
        }
        if (signal) {
          if (signal.aborted) onAbort()
          else signal.addEventListener('abort', onAbort)
        }
        const detachAbort = () => {
          if (signal) signal.removeEventListener('abort', onAbort)
        }

        readStream.on('data', (chunk: Buffer) => {
          transferred += chunk.length
          onProgress?.(transferred, total)
        })
        readStream.on('error', (err: Error) => {
          detachAbort()
          log(`downloadFile read error: ${err.message}`)
          settle(() => reject(aborted ? cancelledError() : err))
        })
        writeStream.on('error', (err: Error) => {
          detachAbort()
          log(`downloadFile write error: ${err.message}`)
          settle(() => reject(aborted ? cancelledError() : err))
        })
        writeStream.on('close', () => {
          detachAbort()
          if (aborted) {
            log(`downloadFile close — aborted`)
            settle(() => reject(cancelledError()))
            return
          }
          log(`downloadFile close — done`)
          onProgress?.(transferred, total)
          settle(() => resolve())
        })
        readStream.pipe(writeStream)
      })
    } catch (err) {
      await this.cleanupPartialFile(localPath)
      throw err
    }
  }

  async downloadFolderAsZip(
    sessionId: string,
    remotePath: string,
    localZipPath: string,
    options: DownloadOptions
  ): Promise<void> {
    const { signal, onProgress } = options
    log(`downloadFolderAsZip(${sessionId.slice(0, 8)}, ${remotePath} → ${localZipPath})`)
    try {
      const rootName = basename(remotePath) || remotePath
      const files = await this.collectFilesRecursive(sessionId, remotePath)
      const sftp = await this.getSftp(sessionId)
      const total = files.reduce((sum, f) => sum + f.size, 0)

      await new Promise<void>((resolve, reject) => {
        let settled = false
        let aborted = false
        let transferred = 0
        const settle = (fn: () => void) => {
          if (!settled) { settled = true; fn() }
        }

        const output = createWriteStream(localZipPath)
        const archive = archiver('zip')
        const activeReadStreams: Array<{ destroy: () => void }> = []

        const onAbort = () => {
          log(`downloadFolderAsZip aborted`)
          aborted = true
          archive.abort()
          for (const s of activeReadStreams) {
            try { s.destroy() } catch { /* already closed */ }
          }
          output.destroy()
        }
        if (signal) {
          if (signal.aborted) onAbort()
          else signal.addEventListener('abort', onAbort)
        }
        const detachAbort = () => {
          if (signal) signal.removeEventListener('abort', onAbort)
        }

        output.on('close', () => {
          detachAbort()
          if (aborted) {
            log(`downloadFolderAsZip close — aborted`)
            settle(() => reject(cancelledError()))
            return
          }
          log(`downloadFolderAsZip close — ${archive.pointer()} bytes written`)
          onProgress?.(transferred, total)
          settle(() => resolve())
        })
        output.on('error', (err: Error) => {
          detachAbort()
          log(`downloadFolderAsZip output error: ${err.message}`)
          settle(() => reject(aborted ? cancelledError() : err))
        })
        archive.on('error', (err: Error) => {
          detachAbort()
          log(`downloadFolderAsZip archive error: ${err.message}`)
          settle(() => reject(aborted ? cancelledError() : err))
        })

        archive.pipe(output)

        for (const file of files) {
          const readStream = sftp.createReadStream(file.path)
          activeReadStreams.push(readStream)
          readStream.on('data', (chunk: Buffer) => {
            transferred += chunk.length
            onProgress?.(transferred, total)
          })
          archive.append(readStream, { name: `${rootName}/${file.relativePath}` })
        }

        archive.finalize().catch((err: Error) => {
          detachAbort()
          log(`downloadFolderAsZip finalize error: ${err.message}`)
          settle(() => reject(aborted ? cancelledError() : err))
        })
      })
    } catch (err) {
      await this.cleanupPartialFile(localZipPath)
      throw err
    }
  }

  private async collectFilesRecursive(
    sessionId: string,
    rootPath: string
  ): Promise<Array<{ path: string; relativePath: string; size: number }>> {
    const results: Array<{ path: string; relativePath: string; size: number }> = []
    const entries = await this.listDir(sessionId, rootPath)
    for (const entry of entries) {
      if (entry.type === 'directory') {
        results.push(...(await this.collectFilesRecursive(sessionId, entry.path)))
      } else if (entry.type === 'file') {
        results.push({ path: entry.path, relativePath: remoteRelative(rootPath, entry.path), size: entry.size })
      }
      // symlinks are intentionally skipped — not followed, to avoid cycles
    }
    return results
  }

  private async cleanupPartialFile(localPath: string): Promise<void> {
    try {
      await fsp.unlink(localPath)
    } catch {
      // nothing to clean up — file was never created
    }
  }

  private async statSafe(sessionId: string, path: string): Promise<import('ssh2').Stats | null> {
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve) => {
      sftp.stat(path, (err, stats) => {
        resolve(err ? null : stats)
      })
    })
  }

  private async copyFile(sessionId: string, sourcePath: string, destPath: string): Promise<void> {
    log(`copyFile(${sessionId.slice(0, 8)}, ${sourcePath} → ${destPath})`)
    const sftp = await this.getSftp(sessionId)
    return new Promise((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => {
        if (!settled) { settled = true; fn() }
      }
      const readStream = sftp.createReadStream(sourcePath)
      const writeStream = sftp.createWriteStream(destPath)
      readStream.on('error', (err: Error) => {
        log(`copyFile read error: ${err.message}`)
        settle(() => reject(err))
      })
      writeStream.on('error', (err: Error) => {
        log(`copyFile write error: ${err.message}`)
        settle(() => reject(err))
      })
      writeStream.on('close', () => {
        log(`copyFile close — done`)
        settle(() => resolve())
      })
      readStream.pipe(writeStream)
    })
  }

  async copy(
    sessionId: string,
    sourcePath: string,
    destPath: string,
    type: 'file' | 'directory',
    overwrite = false
  ): Promise<void> {
    log(`copy(${sessionId.slice(0, 8)}, ${sourcePath} → ${destPath}, type=${type}, overwrite=${overwrite})`)

    if (destPath === sourcePath || destPath.startsWith(`${sourcePath}/`)) {
      const err = new Error('Cannot paste a folder into itself or one of its own subfolders')
      log(`copy → rejected: ${destPath} is ${sourcePath} or a descendant of it`)
      throw err
    }

    const existing = await this.statSafe(sessionId, destPath)
    if (existing) {
      if (!overwrite) {
        log(`copy → DEST_EXISTS at ${destPath}`)
        throw Object.assign(new Error('Destination already exists'), { code: 'DEST_EXISTS' })
      }
      const isDir = (existing.mode & 0o170000) === 0o040000
      log(`copy → overwrite requested, removing existing ${isDir ? 'directory' : 'file'} at ${destPath}`)
      if (isDir) {
        await this.deleteRecursive(sessionId, destPath)
      } else {
        await this.delete(sessionId, destPath)
      }
    }

    if (type === 'file') {
      await this.copyFile(sessionId, sourcePath, destPath)
    } else {
      await this.mkdir(sessionId, destPath)
      const entries = await this.listDir(sessionId, sourcePath)
      for (const entry of entries) {
        if (entry.type !== 'file' && entry.type !== 'directory') continue // symlinks skipped
        const childDest = destPath === '/' ? `/${entry.name}` : `${destPath}/${entry.name}`
        await this.copy(sessionId, entry.path, childDest, entry.type, true)
      }
    }

    log(`copy(${sessionId.slice(0, 8)}) → done`)
  }

  private isBinaryBuffer(buffer: Buffer): boolean {
    const len = Math.min(buffer.length, 8192)
    for (let i = 0; i < len; i++) {
      if (buffer[i] === 0) return true
    }
    return false
  }

  private matchesInFile(content: string, lowerQuery: string): { totalMatches: number; matches: SearchLineMatch[] } {
    const matches: SearchLineMatch[] = []
    let totalMatches = 0

    for (const [i, lineText] of content.split(/\r\n|\r|\n/).entries()) {
      const lowerLine = lineText.toLowerCase()
      let fromIndex = 0
      let lineHasMatch = false
      while (true) {
        const at = lowerLine.indexOf(lowerQuery, fromIndex)
        if (at === -1) break
        totalMatches++
        lineHasMatch = true
        fromIndex = at + lowerQuery.length
      }
      if (lineHasMatch && matches.length < MAX_REPORTED_MATCHES_PER_FILE) {
        const text = lineText.length > MAX_MATCH_TEXT_LENGTH
          ? `${lineText.slice(0, MAX_MATCH_TEXT_LENGTH)}...`
          : lineText
        matches.push({ line: i + 1, text })
      }
    }

    return { totalMatches, matches }
  }

  private async searchFile(
    sessionId: string,
    entry: FileNode,
    lowerQuery: string,
    onMatch?: (result: SearchFileMatch) => void
  ): Promise<void> {
    if (entry.size > MAX_SEARCH_FILE_SIZE) return

    let buffer: Buffer
    try {
      buffer = await this.readFile(sessionId, entry.path)
    } catch (err: unknown) {
      log(`searchInFolder readFile failed for ${entry.path}: ${(err as Error).message}`)
      return
    }

    if (this.isBinaryBuffer(buffer)) return

    const { totalMatches, matches } = this.matchesInFile(buffer.toString('utf8'), lowerQuery)
    if (totalMatches > 0) {
      onMatch?.({ path: entry.path, name: entry.name, totalMatches, matches })
    }
  }

  async searchInFolder(
    sessionId: string,
    rootPath: string,
    query: string,
    options: SearchOptions
  ): Promise<void> {
    const { signal, onMatch } = options
    log(`searchInFolder(${sessionId.slice(0, 8)}, ${rootPath}, query="${query}")`)
    const lowerQuery = query.toLowerCase()

    const checkAborted = () => {
      if (signal?.aborted) throw cancelledSearchError()
    }

    const walk = async (dirPath: string): Promise<void> => {
      checkAborted()
      let entries: FileNode[]
      try {
        entries = await this.listDir(sessionId, dirPath)
      } catch (err: unknown) {
        log(`searchInFolder listDir failed for ${dirPath}: ${(err as Error).message}`)
        return
      }

      for (const entry of entries) {
        checkAborted()
        if (entry.type === 'directory') {
          await walk(entry.path)
        } else if (entry.type === 'file') {
          await this.searchFile(sessionId, entry, lowerQuery, onMatch)
        }
        // symlinks are intentionally skipped — not followed, to avoid cycles
      }
    }

    await walk(rootPath)
  }
}

function remoteRelative(root: string, full: string): string {
  const prefix = root === '/' ? '/' : `${root}/`
  return full.startsWith(prefix) ? full.slice(prefix.length) : full.replace(/^\//, '')
}
