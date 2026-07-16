import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Readable, Writable } from 'stream'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Ssh2SftpService } from '../Ssh2SftpService'
import type { Ssh2Client } from '../../ssh/Ssh2Client'
import type { SearchFileMatch } from '../../../domain/ports/ISftpService'

const MODE_DIR = 0o040000
const MODE_FILE = 0o100000

class FakeRemoteFs {
  dirs = new Set<string>(['/'])
  files = new Map<string, Buffer>()

  addDir(path: string): void {
    this.dirs.add(path)
  }

  addFile(path: string, content: string): void {
    this.files.set(path, Buffer.from(content))
  }

  isDir(path: string): boolean {
    return this.dirs.has(path)
  }

  isFile(path: string): boolean {
    return this.files.has(path)
  }

  exists(path: string): boolean {
    return this.isDir(path) || this.isFile(path)
  }

  childNames(path: string): string[] {
    const prefix = path === '/' ? '/' : `${path}/`
    const names = new Set<string>()
    for (const p of [...this.dirs, ...this.files.keys()]) {
      if (p === path || !p.startsWith(prefix)) continue
      const rest = p.slice(prefix.length)
      const name = rest.split('/')[0]
      if (name) names.add(name)
    }
    return [...names]
  }
}

function makeFakeSftp(fs: FakeRemoteFs) {
  return {
    on: () => {},
    stat(path: string, cb: (err: Error | null, stats?: { mode: number; size: number }) => void) {
      if (fs.isDir(path)) return cb(null, { mode: MODE_DIR, size: 0 })
      if (fs.isFile(path)) return cb(null, { mode: MODE_FILE, size: fs.files.get(path)!.length })
      cb(new Error(`No such file: ${path}`))
    },
    readdir(path: string, cb: (err: Error | null, list?: unknown[]) => void) {
      if (!fs.isDir(path)) return cb(new Error(`Not a directory: ${path}`))
      const list = fs.childNames(path).map((name) => {
        const full = path === '/' ? `/${name}` : `${path}/${name}`
        const isDir = fs.isDir(full)
        return {
          filename: name,
          attrs: { mode: isDir ? MODE_DIR : MODE_FILE, size: isDir ? 0 : fs.files.get(full)!.length, mtime: 0 }
        }
      })
      cb(null, list)
    },
    mkdir(path: string, cb: (err: Error | null) => void) {
      fs.dirs.add(path)
      cb(null)
    },
    rmdir(path: string, cb: (err: Error | null) => void) {
      fs.dirs.delete(path)
      cb(null)
    },
    unlink(path: string, cb: (err: Error | null) => void) {
      fs.files.delete(path)
      cb(null)
    },
    createReadStream(path: string) {
      return Readable.from([fs.files.get(path) ?? Buffer.alloc(0)])
    },
    createWriteStream(path: string) {
      const chunks: Buffer[] = []
      const stream = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(chunk)
          cb()
        }
      })
      stream.on('finish', () => {
        fs.files.set(path, Buffer.concat(chunks))
        stream.emit('close')
      })
      return stream
    }
  }
}

function makeService(fs: FakeRemoteFs): Ssh2SftpService {
  const fakeSftp = makeFakeSftp(fs)
  const fakeClient = {
    sftp: (cb: (err: Error | null, sftp: unknown) => void) => cb(null, fakeSftp)
  }
  const fakeSshClient = {
    isConnected: () => true,
    getClient: () => fakeClient,
    onDisconnected: () => {}
  }
  return new Ssh2SftpService(fakeSshClient as unknown as Ssh2Client)
}

/** A readable that trickles out `content` a few bytes at a time, each on its own macrotask,
 *  so tests can observe intermediate progress and abort mid-stream. */
function chunkedReadable(content: Buffer, chunkSize = 4, delayMs = 5): Readable {
  let offset = 0
  return new Readable({
    read() {
      if (offset >= content.length) {
        this.push(null)
        return
      }
      const end = Math.min(offset + chunkSize, content.length)
      const chunk = content.subarray(offset, end)
      offset = end
      setTimeout(() => this.push(chunk), delayMs)
    }
  })
}

function makeServiceWithChunkedReads(fs: FakeRemoteFs, chunkSize = 4, delayMs = 5): Ssh2SftpService {
  const fakeSftp = {
    ...makeFakeSftp(fs),
    createReadStream(path: string) {
      return chunkedReadable(fs.files.get(path) ?? Buffer.alloc(0), chunkSize, delayMs)
    }
  }
  const fakeClient = {
    sftp: (cb: (err: Error | null, sftp: unknown) => void) => cb(null, fakeSftp)
  }
  const fakeSshClient = {
    isConnected: () => true,
    getClient: () => fakeClient,
    onDisconnected: () => {}
  }
  return new Ssh2SftpService(fakeSshClient as unknown as Ssh2Client)
}

function erroringReadable(message: string): Readable {
  const stream = new Readable({ read() {} })
  process.nextTick(() => stream.emit('error', new Error(message)))
  return stream
}

function makeServiceWithFailures(
  fs: FakeRemoteFs,
  options: { failReaddirPath?: string; failReadFilePath?: string }
): Ssh2SftpService {
  const base = makeFakeSftp(fs)
  const fakeSftp = {
    ...base,
    readdir(path: string, cb: (err: Error | null, list?: unknown[]) => void) {
      if (path === options.failReaddirPath) {
        cb(new Error(`Permission denied: ${path}`))
        return
      }
      base.readdir(path, cb)
    },
    createReadStream(path: string) {
      if (path === options.failReadFilePath) {
        return erroringReadable('Permission denied')
      }
      return base.createReadStream(path)
    }
  }
  const fakeClient = {
    sftp: (cb: (err: Error | null, sftp: unknown) => void) => cb(null, fakeSftp)
  }
  const fakeSshClient = {
    isConnected: () => true,
    getClient: () => fakeClient,
    onDisconnected: () => {}
  }
  return new Ssh2SftpService(fakeSshClient as unknown as Ssh2Client)
}

describe('Ssh2SftpService.searchInFolder', () => {
  let fs: FakeRemoteFs
  let service: Ssh2SftpService

  beforeEach(() => {
    fs = new FakeRemoteFs()
    service = makeService(fs)
  })

  it('emits onMatch for files containing the term, case-insensitively', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'Hello World\nfoo BAR baz\nHello again')
    fs.addFile('/proj/b.txt', 'nothing to see here')

    const matches: SearchFileMatch[] = []
    await service.searchInFolder('sess-1', '/proj', 'hello', { onMatch: (m) => matches.push(m) })

    expect(matches).toHaveLength(1)
    expect(matches[0]).toEqual({
      path: '/proj/a.txt',
      name: 'a.txt',
      totalMatches: 2,
      matches: [
        { line: 1, text: 'Hello World' },
        { line: 3, text: 'Hello again' }
      ]
    })
  })

  it('skips files above the size limit without reading them', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/big.txt', `match ${'x'.repeat(3 * 1024 * 1024)}`)
    fs.addFile('/proj/small.txt', 'match here')

    const matches: SearchFileMatch[] = []
    await service.searchInFolder('sess-1', '/proj', 'match', { onMatch: (m) => matches.push(m) })

    expect(matches.map((m) => m.path)).toEqual(['/proj/small.txt'])
  })

  it('skips binary files (null byte in the first 8 KB)', async () => {
    fs.addDir('/proj')
    fs.files.set('/proj/bin.dat', Buffer.from([0x68, 0x69, 0x00, 0x6d, 0x61, 0x74, 0x63, 0x68]))
    fs.addFile('/proj/text.txt', 'match here')

    const matches: SearchFileMatch[] = []
    await service.searchInFolder('sess-1', '/proj', 'match', { onMatch: (m) => matches.push(m) })

    expect(matches.map((m) => m.path)).toEqual(['/proj/text.txt'])
  })

  it('continues the walk after a listDir failure on one subdirectory', async () => {
    fs.addDir('/proj')
    fs.addDir('/proj/bad')
    fs.addDir('/proj/good')
    fs.addFile('/proj/good/a.txt', 'match here')
    const failingService = makeServiceWithFailures(fs, { failReaddirPath: '/proj/bad' })

    const matches: SearchFileMatch[] = []
    await failingService.searchInFolder('sess-1', '/proj', 'match', { onMatch: (m) => matches.push(m) })

    expect(matches.map((m) => m.path)).toEqual(['/proj/good/a.txt'])
  })

  it('continues the walk after a readFile failure on one file', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/broken.txt', 'match here')
    fs.addFile('/proj/ok.txt', 'match here too')
    const failingService = makeServiceWithFailures(fs, { failReadFilePath: '/proj/broken.txt' })

    const matches: SearchFileMatch[] = []
    await failingService.searchInFolder('sess-1', '/proj', 'match', { onMatch: (m) => matches.push(m) })

    expect(matches.map((m) => m.path)).toEqual(['/proj/ok.txt'])
  })

  it('rejects with code CANCELLED and stops reporting further matches once the signal aborts mid-walk', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'match one')
    fs.addFile('/proj/b.txt', 'match two')
    fs.addFile('/proj/c.txt', 'match three')

    const controller = new AbortController()
    const matches: SearchFileMatch[] = []

    const promise = service.searchInFolder('sess-1', '/proj', 'match', {
      signal: controller.signal,
      onMatch: (m) => {
        matches.push(m)
        if (matches.length === 1) controller.abort()
      }
    })

    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(matches).toHaveLength(1)
  })
})

describe('Ssh2SftpService.copy', () => {
  let fs: FakeRemoteFs
  let service: Ssh2SftpService

  beforeEach(() => {
    fs = new FakeRemoteFs()
    service = makeService(fs)
  })

  it('copies a file to a free destination', async () => {
    fs.addFile('/src.txt', 'hello world')

    await service.copy('sess-1', '/src.txt', '/dest.txt', 'file')

    expect(fs.files.get('/dest.txt')?.toString()).toBe('hello world')
    expect(fs.files.get('/src.txt')?.toString()).toBe('hello world')
  })

  it('recursively copies a directory with nested subdirectories', async () => {
    fs.addDir('/proj')
    fs.addDir('/proj/sub')
    fs.addFile('/proj/a.txt', 'A')
    fs.addFile('/proj/sub/b.txt', 'B')

    await service.copy('sess-1', '/proj', '/proj-copy', 'directory')

    expect(fs.isDir('/proj-copy')).toBe(true)
    expect(fs.isDir('/proj-copy/sub')).toBe(true)
    expect(fs.files.get('/proj-copy/a.txt')?.toString()).toBe('A')
    expect(fs.files.get('/proj-copy/sub/b.txt')?.toString()).toBe('B')
  })

  it('rejects with DEST_EXISTS when the destination exists and overwrite is not requested', async () => {
    fs.addFile('/src.txt', 'hello')
    fs.addFile('/dest.txt', 'existing')

    await expect(service.copy('sess-1', '/src.txt', '/dest.txt', 'file')).rejects.toMatchObject({
      code: 'DEST_EXISTS'
    })
    expect(fs.files.get('/dest.txt')?.toString()).toBe('existing')
  })

  it('overwrites an existing file when overwrite is true', async () => {
    fs.addFile('/src.txt', 'new content')
    fs.addFile('/dest.txt', 'old content')

    await service.copy('sess-1', '/src.txt', '/dest.txt', 'file', true)

    expect(fs.files.get('/dest.txt')?.toString()).toBe('new content')
  })

  it('overwrites an existing directory wholesale when overwrite is true', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'A')

    fs.addDir('/dest')
    fs.addFile('/dest/stale.txt', 'stale')

    await service.copy('sess-1', '/proj', '/dest', 'directory', true)

    expect(fs.files.has('/dest/stale.txt')).toBe(false)
    expect(fs.files.get('/dest/a.txt')?.toString()).toBe('A')
  })

  it('rejects pasting a directory into itself without any I/O', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'A')

    await expect(service.copy('sess-1', '/proj', '/proj', 'directory')).rejects.toThrow()
    expect(fs.files.get('/proj/a.txt')?.toString()).toBe('A')
  })

  it('rejects pasting a directory into its own subfolder without any I/O', async () => {
    fs.addDir('/proj')
    fs.addDir('/proj/sub')
    fs.addFile('/proj/a.txt', 'A')

    await expect(service.copy('sess-1', '/proj', '/proj/sub', 'directory')).rejects.toThrow()
    expect(fs.dirs.has('/proj/sub')).toBe(true)
    expect(fs.files.get('/proj/a.txt')?.toString()).toBe('A')
  })

  it('rejects the self-paste guard even when overwrite is requested', async () => {
    fs.addDir('/proj')

    await expect(service.copy('sess-1', '/proj', '/proj', 'directory', true)).rejects.toThrow()
  })
})

describe('Ssh2SftpService.downloadFile', () => {
  let fs: FakeRemoteFs
  let tmpDir: string

  beforeEach(() => {
    fs = new FakeRemoteFs()
    tmpDir = mkdtempSync(join(tmpdir(), 'ssh2sftp-download-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reports increasing progress and writes the full file, with a final value equal to total', async () => {
    const content = 'abcdefghijklmnopqrstuvwx' // 24 bytes
    fs.addFile('/remote.txt', content)
    const service = makeServiceWithChunkedReads(fs, 4, 2)
    const localPath = join(tmpDir, 'out.txt')

    const calls: Array<{ transferred: number; total?: number }> = []
    await service.downloadFile('sess-1', '/remote.txt', localPath, {
      transferId: 't1',
      onProgress: (transferred, total) => calls.push({ transferred, total })
    })

    // At least one intermediate chunk plus the guaranteed final emit (task 3.3/design decision 3),
    // which may repeat the last chunk's value — so the sequence is non-decreasing, not strictly increasing.
    expect(calls.length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i].transferred).toBeGreaterThanOrEqual(calls[i - 1].transferred)
    }
    expect(calls.some((c, i) => i > 0 && c.transferred > calls[i - 1].transferred)).toBe(true)
    expect(calls[calls.length - 1]).toEqual({ transferred: content.length, total: content.length })
    expect(readFileSync(localPath, 'utf8')).toBe(content)
  })

  it('rejects with code CANCELLED and deletes the partial file when aborted mid-stream', async () => {
    fs.addFile('/remote.txt', 'x'.repeat(64))
    const service = makeServiceWithChunkedReads(fs, 4, 5)
    const localPath = join(tmpDir, 'out.txt')
    const controller = new AbortController()

    const promise = service.downloadFile('sess-1', '/remote.txt', localPath, {
      transferId: 't2',
      signal: controller.signal,
      onProgress: (transferred) => {
        if (transferred > 0) controller.abort()
      }
    })

    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(existsSync(localPath)).toBe(false)
  })

  it('proceeds with an indeterminate total when the remote stat fails', async () => {
    // No file registered at this path, so the internal statSafe() lookup fails —
    // but the read stream still yields content in this fake, matching the
    // "size unavailable but transfer still succeeds" scenario.
    const service = makeServiceWithChunkedReads(fs, 4, 2)
    const localPath = join(tmpDir, 'out.txt')

    const totals: Array<number | undefined> = []
    await service.downloadFile('sess-1', '/missing.txt', localPath, {
      transferId: 't3',
      onProgress: (_transferred, total) => totals.push(total)
    })

    expect(totals.every((t) => t === undefined)).toBe(true)
  })
})

describe('Ssh2SftpService.downloadFolderAsZip', () => {
  let fs: FakeRemoteFs
  let tmpDir: string

  beforeEach(() => {
    fs = new FakeRemoteFs()
    tmpDir = mkdtempSync(join(tmpdir(), 'ssh2sftp-download-zip-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('sums source file sizes as total and reports a final progress value equal to it', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'a'.repeat(10))
    fs.addFile('/proj/b.txt', 'b'.repeat(20))
    const total = 30
    const service = makeServiceWithChunkedReads(fs, 4, 2)
    const localZipPath = join(tmpDir, 'out.zip')

    const calls: Array<{ transferred: number; total?: number }> = []
    await service.downloadFolderAsZip('sess-1', '/proj', localZipPath, {
      transferId: 'z1',
      onProgress: (transferred, totalArg) => calls.push({ transferred, total: totalArg })
    })

    expect(calls[calls.length - 1]).toEqual({ transferred: total, total })
    expect(existsSync(localZipPath)).toBe(true)
  })

  it('rejects with code CANCELLED and deletes the partial zip when aborted mid-stream', async () => {
    fs.addDir('/proj')
    fs.addFile('/proj/a.txt', 'x'.repeat(64))
    fs.addFile('/proj/b.txt', 'y'.repeat(64))
    const service = makeServiceWithChunkedReads(fs, 4, 5)
    const localZipPath = join(tmpDir, 'out.zip')
    const controller = new AbortController()

    const promise = service.downloadFolderAsZip('sess-1', '/proj', localZipPath, {
      transferId: 'z2',
      signal: controller.signal,
      onProgress: (transferred) => {
        if (transferred > 0) controller.abort()
      }
    })

    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED' })
    expect(existsSync(localZipPath)).toBe(false)
  })
})
