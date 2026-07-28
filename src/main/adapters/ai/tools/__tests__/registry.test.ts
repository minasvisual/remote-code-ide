import { describe, it, expect, vi } from 'vitest'
import { ToolRegistry } from '../registry'
import type { ISftpService } from '../../../../domain/ports/ISftpService'
import type { ISshClient } from '../../../../domain/ports/ISshClient'
import type { FileNode } from '../../../../domain/entities/FileNode'

function makeSftp(overrides: Partial<ISftpService> = {}): ISftpService {
  return {
    listDir: vi.fn().mockResolvedValue([]),
    getFileInfo: vi.fn(),
    readFile: vi.fn().mockResolvedValue(Buffer.from('')),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    delete: vi.fn(),
    deleteRecursive: vi.fn(),
    createFile: vi.fn(),
    uploadFile: vi.fn(),
    mkdirp: vi.fn(),
    downloadFile: vi.fn(),
    downloadFolderAsZip: vi.fn(),
    copy: vi.fn(),
    searchInFolder: vi.fn(),
    ...overrides
  } as ISftpService
}

function makeSsh(overrides: Partial<ISshClient> = {}): ISshClient {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    disconnectAll: vi.fn(),
    test: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    execCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    ...overrides
  } as ISshClient
}

describe('ToolRegistry', () => {
  it('advertises all four tool definitions, including write_file', () => {
    const registry = new ToolRegistry(makeSftp(), makeSsh())
    const names = registry.definitions.map((d) => d.name).sort()
    expect(names).toEqual(['list_directory', 'read_file', 'run_command', 'write_file'])
  })

  it('flags read-only tools as non-mutating and write_file/run_command as mutating', () => {
    const registry = new ToolRegistry(makeSftp(), makeSsh())
    expect(registry.isMutating('list_directory')).toBe(false)
    expect(registry.isMutating('read_file')).toBe(false)
    expect(registry.isMutating('write_file')).toBe(true)
    expect(registry.isMutating('run_command')).toBe(true)
  })

  it('identifies write_file via isWriteFile', () => {
    const registry = new ToolRegistry(makeSftp(), makeSsh())
    expect(registry.isWriteFile('write_file')).toBe(true)
    expect(registry.isWriteFile('run_command')).toBe(false)
  })

  it('executes list_directory via ISftpService.listDir', async () => {
    const nodes: FileNode[] = [
      { name: 'a.txt', path: '/a.txt', type: 'file', size: 1, modifiedAt: '', permissions: '', isLoaded: true },
      { name: 'sub', path: '/sub', type: 'directory', size: 0, modifiedAt: '', permissions: '', isLoaded: true }
    ]
    const listDir = vi.fn().mockResolvedValue(nodes)
    const registry = new ToolRegistry(makeSftp({ listDir }), makeSsh())

    const result = await registry.execute('session-1', 'list_directory', { path: '/' })

    expect(listDir).toHaveBeenCalledWith('session-1', '/')
    expect(result.isError).toBe(false)
    expect(result.content).toContain('a.txt')
    expect(result.content).toContain('sub')
  })

  it('reports a list_directory failure as an error result instead of throwing', async () => {
    const listDir = vi.fn().mockRejectedValue(new Error('permission denied'))
    const registry = new ToolRegistry(makeSftp({ listDir }), makeSsh())

    const result = await registry.execute('session-1', 'list_directory', { path: '/root' })

    expect(result.isError).toBe(true)
    expect(result.content).toContain('permission denied')
  })

  it('executes read_file via ISftpService.readFile and decodes utf8', async () => {
    const readFile = vi.fn().mockResolvedValue(Buffer.from('hello world'))
    const registry = new ToolRegistry(makeSftp({ readFile }), makeSsh())

    const result = await registry.execute('session-1', 'read_file', { path: '/a.txt' })

    expect(readFile).toHaveBeenCalledWith('session-1', '/a.txt')
    expect(result).toEqual({ content: 'hello world', isError: false })
  })

  it('truncates read_file content larger than 5 MB', async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 10, 'a')
    const readFile = vi.fn().mockResolvedValue(big)
    const registry = new ToolRegistry(makeSftp({ readFile }), makeSsh())

    const result = await registry.execute('session-1', 'read_file', { path: '/big.txt' })

    expect(result.isError).toBe(false)
    expect(result.content).toContain('…(truncated to 5 MB)')
  })

  it('executes run_command via ISshClient.execCommand and reports a non-zero exit code as an error', async () => {
    const execCommand = vi.fn().mockResolvedValue({ stdout: '', stderr: 'not found', exitCode: 127 })
    const registry = new ToolRegistry(makeSftp(), makeSsh({ execCommand }))

    const result = await registry.execute('session-1', 'run_command', { command: 'doesnotexist' })

    expect(execCommand).toHaveBeenCalledWith('session-1', 'doesnotexist')
    expect(result.isError).toBe(true)
    expect(result.content).toContain('exit code: 127')
    expect(result.content).toContain('not found')
  })

  it('returns an error result for an unknown tool name instead of throwing', async () => {
    const registry = new ToolRegistry(makeSftp(), makeSsh())
    const result = await registry.execute('session-1', 'delete_everything', {})
    expect(result.isError).toBe(true)
    expect(result.content).toContain('Unknown tool')
  })

  describe('prepareWriteFileDiff', () => {
    it('reads the current remote content for the diff preview', async () => {
      const readFile = vi.fn().mockResolvedValue(Buffer.from('old content'))
      const registry = new ToolRegistry(makeSftp({ readFile }), makeSsh())

      const preview = await registry.prepareWriteFileDiff('session-1', { path: '/a.txt', content: 'new content' })

      expect(preview).toEqual({ path: '/a.txt', currentContent: 'old content', proposedContent: 'new content' })
    })

    it('treats an unreadable/nonexistent path as an empty current content (new file)', async () => {
      const readFile = vi.fn().mockRejectedValue(new Error('No such file'))
      const registry = new ToolRegistry(makeSftp({ readFile }), makeSsh())

      const preview = await registry.prepareWriteFileDiff('session-1', { path: '/new.txt', content: 'brand new' })

      expect(preview).toEqual({ path: '/new.txt', currentContent: '', proposedContent: 'brand new' })
    })
  })
})
