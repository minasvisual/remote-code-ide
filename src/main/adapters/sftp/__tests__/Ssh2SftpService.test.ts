import { describe, it, expect, beforeEach } from 'vitest'
import { Readable, Writable } from 'stream'
import { Ssh2SftpService } from '../Ssh2SftpService'
import type { Ssh2Client } from '../../ssh/Ssh2Client'

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
