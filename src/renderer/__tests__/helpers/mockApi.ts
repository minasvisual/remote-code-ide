import { vi } from 'vitest'
import type { IRemoteApi } from '../../domain/ports/IRemoteApi'
import type { Connection } from '../../domain/entities/Connection'

export function createMockConnection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn-1',
    label: 'Test Server',
    host: '127.0.0.1',
    port: 22,
    username: 'root',
    authType: 'password',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createMockApi(): IRemoteApi {
  return {
    connections: {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(createMockConnection()),
      update: vi.fn().mockResolvedValue(createMockConnection()),
      delete: vi.fn().mockResolvedValue(undefined),
      test: vi.fn().mockResolvedValue({ success: true, message: 'Connected' }),
    },
    ssh: {
      connect: vi.fn().mockResolvedValue({ success: true, sessionId: 'session-1' }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      onDisconnected: vi.fn(),
    },
    sftp: {
      listDir: vi.fn().mockResolvedValue([]),
      readFile: vi.fn().mockResolvedValue({ localTempPath: '/tmp/file.txt', content: 'file content' }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      rename: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteRecursive: vi.fn().mockResolvedValue(undefined),
      createFile: vi.fn().mockResolvedValue(undefined),
      openUploadDialog: vi.fn().mockResolvedValue(null),
      uploadFiles: vi.fn().mockResolvedValue(undefined),
      onUploadProgress: vi.fn().mockReturnValue(() => {}),
    },
    terminal: {
      create: vi.fn().mockResolvedValue('term-1'),
      sendInput: vi.fn(),
      resize: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      onOutput: vi.fn(),
    },
    versions: {
      node: '20.0.0',
      electron: '29.0.0',
      chrome: '122.0.0',
    },
  }
}
