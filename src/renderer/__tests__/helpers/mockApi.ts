import { vi } from 'vitest'
import type { IRemoteApi } from '../../domain/ports/IRemoteApi'
import type { Connection } from '../../domain/entities/Connection'
import type { InstalledExtension } from '../../domain/entities/InstalledExtension'
import type { AiProviderConfig } from '../../domain/entities/AiProviderConfig'

export function createMockInstalledExtension(
  overrides: Partial<InstalledExtension> = {}
): InstalledExtension {
  return {
    id: 'publisher.ext',
    namespace: 'publisher',
    name: 'ext',
    version: '1.0.0',
    displayName: 'Test Extension',
    enabled: false,
    hasBasicModeContribution: true,
    installDir: '/userData/extensions/publisher.ext-1.0.0',
    themeFile: './themes/dark.json',
    ...overrides,
  }
}

export function createMockAiProviderConfig(overrides: Partial<AiProviderConfig> = {}): AiProviderConfig {
  return {
    id: 'provider-1',
    label: 'Test Provider',
    providerType: 'anthropic',
    baseUrl: undefined,
    model: 'claude-sonnet-4-5',
    hasApiKey: true,
    isDefault: true,
    ...overrides,
  }
}

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
      getFileInfo: vi.fn().mockResolvedValue({
        name: 'file.txt',
        path: '/file.txt',
        type: 'file',
        size: 1024,
        permissions: '644',
        owner: 1000,
        group: 1000,
        modifiedAt: '2026-01-01T00:00:00.000Z',
        accessedAt: '2026-01-01T00:00:00.000Z',
      }),
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
      openSaveDialog: vi.fn().mockResolvedValue(null),
      downloadFile: vi.fn().mockResolvedValue({ transferId: 'transfer-1' }),
      downloadFolder: vi.fn().mockResolvedValue({ transferId: 'transfer-1' }),
      onDownloadProgress: vi.fn().mockReturnValue(() => {}),
      cancelDownload: vi.fn().mockResolvedValue(undefined),
      copy: vi.fn().mockResolvedValue(undefined),
      searchInFolder: vi.fn().mockResolvedValue({ searchId: 'search-1' }),
      onSearchProgress: vi.fn().mockReturnValue(() => {}),
      cancelSearch: vi.fn().mockResolvedValue(undefined),
    },
    terminal: {
      create: vi.fn().mockResolvedValue('term-1'),
      sendInput: vi.fn(),
      resize: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
      onOutput: vi.fn(),
    },
    extensions: {
      install: vi.fn().mockResolvedValue(createMockInstalledExtension()),
      list: vi.fn().mockResolvedValue([]),
      uninstall: vi.fn().mockResolvedValue(undefined),
      setEnabled: vi.fn().mockResolvedValue(createMockInstalledExtension({ enabled: true })),
      readThemeFile: vi.fn().mockResolvedValue(JSON.stringify({ type: 'dark', colors: {} })),
    },
    ai: {
      providers: {
        list: vi.fn().mockResolvedValue([]),
        save: vi.fn().mockResolvedValue(createMockAiProviderConfig()),
        update: vi.fn().mockResolvedValue(createMockAiProviderConfig()),
        delete: vi.fn().mockResolvedValue(undefined),
        setDefault: vi.fn().mockResolvedValue(undefined),
        test: vi.fn().mockResolvedValue({ success: true, message: 'Connection successful' }),
        supportsTools: vi.fn().mockResolvedValue(true),
      },
      chat: {
        send: vi.fn().mockResolvedValue({ chatId: 'chat-1' }),
        onChunk: vi.fn().mockReturnValue(() => {}),
        cancel: vi.fn().mockResolvedValue(undefined),
        onToolCallPending: vi.fn().mockReturnValue(() => {}),
        onToolCallResult: vi.fn().mockReturnValue(() => {}),
        approveTool: vi.fn().mockResolvedValue(undefined),
        denyTool: vi.fn().mockResolvedValue(undefined),
      },
    },
    versions: {
      node: '20.0.0',
      electron: '29.0.0',
      chrome: '122.0.0',
    },
  }
}
