# Main Process — Agent Guide

Node.js process. Has full access to `electron`, `ssh2`, `fs`, `os`, `path`.

## Entry Point

`src/main/index.ts` — instantiates all adapters, registers all IPC handlers, creates BrowserWindow.
**This is the only file that does `new XxxAdapter()`.** Adapters are injected into IPC handlers
as constructor arguments — no global singletons outside of `index.ts`.

## Layer Rules

```
domain/entities/     ← plain TypeScript interfaces, zero imports
domain/ports/        ← interfaces (I-prefix): ISshClient, ISftpService, IConnectionRepo, ICryptoService
adapters/            ← concrete classes that implement port interfaces
infrastructure/ipc/  ← thin handlers: validate input → call service → return result
```

Adapters depend on port interfaces, not on each other.
IPC handlers depend on port interfaces, not on concrete adapters.

## Adding a New Adapter

```typescript
// 1. Define the port interface
// src/main/domain/ports/IFooService.ts
export interface IFooService {
  doThing(param: string): Promise<Result>
}

// 2. Implement the adapter
// src/main/adapters/foo/Ssh2FooService.ts
import type { IFooService } from '../../domain/ports/IFooService'
export class Ssh2FooService implements IFooService {
  constructor(private sshClient: Ssh2Client) {}
  async doThing(param: string): Promise<Result> { ... }
}

// 3. Register in src/main/index.ts
const fooService = new Ssh2FooService(sshClient)
registerFooIpc(fooService)
```

## IPC Handler Pattern

```typescript
// src/main/infrastructure/ipc/foo.ipc.ts
import { ipcMain } from 'electron'
import type { IFooService } from '../../domain/ports/IFooService'

export function registerFooIpc(service: IFooService): void {
  ipcMain.handle('foo:doThing', async (_e, param: string) => {
    // IPC handlers: validate → call service → return plain serializable object
    // Never throw — always return { success, data?, error? } for recoverable errors
    try {
      const result = await service.doThing(param)
      return { success: true, data: result }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })
}
```

## Ssh2Client — Key Methods

`sshClient.getClient(sessionId)` → returns the live `ssh2.Client` for a session.
`sshClient.onDisconnected(cb)` → fires when a session drops unexpectedly.
`sshClient.isConnected(sessionId)` → check before using a session.

Always check `isConnected` before opening a new SFTP channel. If the session is gone,
surface a meaningful error — don't crash.

## TempFileManager

```typescript
// Create: gives a unique local path under os.tmpdir()/mycodeany/<sessionId>/
const localPath = tempFiles.createTempPath(sessionId, 'filename.ts')

// Delete single file:
tempFiles.deleteFile(localPath)

// Delete all files for a session (called on disconnect):
tempFiles.deleteSessionFiles(sessionId)

// Delete all (called on app quit via before-quit):
tempFiles.cleanAll()
```

## Electron.safeStorage Rules

- `SafeStorageCrypto.encrypt(plaintext)` → base64 string (store this)
- `SafeStorageCrypto.decrypt(base64)` → original plaintext
- Only callable after `app.whenReady()` resolves
- If `safeStorage.isEncryptionAvailable()` returns false (rare CI/headless env), throw — never fall back to plaintext

## Connection Lifecycle

```
connections:save → encrypt credentials → ElectronStoreConnectionRepo.save()
connections:test → Ssh2Client.test() → temporary client, no session stored
ssh:connect      → decrypt credentials → Ssh2Client.connect() → returns sessionId
ssh:disconnect   → Ssh2Client.disconnect() → TempFileManager.deleteSessionFiles()
ssh:disconnected → event pushed to renderer via webContents.send
```
