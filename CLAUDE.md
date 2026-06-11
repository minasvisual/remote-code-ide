# RemoteCodeIDE — Agent Guide

Remote IDE desktop app: SSH/SFTP connections + Monaco editor + integrated terminal.
Similar to Codeanywhere / RemoteSSH.

## Commands

```bash
npm run dev          # hot-reload (Electron + React)
npm run build        # production build → out/
npm run typecheck    # tsc both sides, no emit
npm run dist:win     # NSIS installer
npm run test:unit    # Vitest unit tests (renderer components)
npm run test:ui      # Vitest UI browser
npm run test:e2e     # Playwright E2E tests (builds first)
npm run test         # unit + E2E
```

Build output goes to `out/` (not `dist/`).

## Architecture: Ports & Adapters (strict layering)

```
Domain (entities + port interfaces)   ← no deps, pure TS
   ↑  imported by
Use Cases / Application                ← calls ports only, no adapters
   ↑  imported by
Adapters (ssh2, electron-store, IPC)  ← implements ports
   ↑  imported by
Infrastructure (Electron entry, IPC registration)
```

**Hard rules:**
- Domain never imports from adapters or infrastructure
- Adapters never import from infrastructure
- Renderer only talks to main via `window.api` (contextBridge)
- Never add `nodeIntegration: true` or disable `contextIsolation`

## Project Layout (critical files)

```
src/
  main/
    index.ts                          ← wires all adapters + IPC, creates BrowserWindow
    domain/
      entities/Connection.ts          ← data shapes (pure TS)
      entities/FileNode.ts
      ports/ISshClient.ts             ← interface contracts
      ports/ISftpService.ts
      ports/IConnectionRepo.ts
      ports/ICryptoService.ts
    adapters/
      ssh/Ssh2Client.ts               ← implements ISshClient
      sftp/Ssh2SftpService.ts         ← implements ISftpService
      storage/ElectronStoreConnectionRepo.ts
      crypto/SafeStorageCrypto.ts     ← electron.safeStorage (OS keychain)
      temp/TempFileManager.ts         ← temp file lifecycle
    infrastructure/ipc/
      connections.ipc.ts
      ssh.ipc.ts
      sftp.ipc.ts
      terminal.ipc.ts
  preload/
    index.ts                          ← contextBridge, typed via IRemoteApi
  renderer/
    domain/
      entities/                       ← mirrored entities (EditorTab, FileNode)
      ports/IRemoteApi.ts             ← the entire preload surface as a TS interface
    adapters/api/WindowRemoteApi.ts   ← returns window.api (typed as IRemoteApi)
    application/contexts/
      AppContext.tsx                   ← connections, active session, notifications
      EditorContext.tsx               ← open tabs, dirty state, save
    ui/components/
      layout/                         ← ActivityBar, StatusBar
      connections/                    ← ConnectionManager, ConnectionForm
      explorer/                       ← FileExplorer, TreeNode
      editor/                         ← MonacoWrapper, EditorTabBar, WelcomeScreen
      terminal/                       ← TerminalPanel (xterm.js)
      extensions/                     ← ExtensionsPanel (OpenVSX search)
      commons/                        ← Button, Input, Modal, Notification, Spinner
```

## Monaco + VSCode Extensions

- Editor: `@monaco-editor/react` wrapping `monaco-editor`
- VSCode API shim: `"vscode": "npm:@codingame/monaco-vscode-api"` in package.json
  - Any extension can `import * as vscode from 'vscode'` and get the compatibility layer
- Service overrides (`@codingame/monaco-vscode-theme-service-override`, etc.) are installed
  at v33.0.9 but **not imported at build time** — they cause Rollup deep-import failures
  with the current Vite setup. Load them lazily at runtime when extension host is needed.
- `MonacoWrapper.tsx` is the **only file** that imports from `@monaco-editor/react`.
  Everything else interacts with editor state through `EditorContext`.

## IPC Channel Naming

Pattern: `domain:action` → always `ipcMain.handle` (async, returns value).
Terminal output uses `ipcMain.on` + `webContents.send` (push from main).

Existing channels:
```
connections:list | save | update | delete | test
ssh:connect | disconnect
sftp:listDir | readFile | writeFile | rename | mkdir | delete
terminal:create | input | resize | output | close
```

## Styling

Tailwind with custom `ide-*` tokens defined in `tailwind.config.cjs`:
```
bg-ide-bg           #1e1e1e   (editor background)
bg-ide-sidebar      #252526   (sidebar)
bg-ide-hover        #2a2d2e   (hover state)
border-ide-border   #3c3c3c
text-ide-text       #cccccc
text-ide-text-muted #858585
bg-ide-accent       #007acc   (blue)
bg-ide-statusbar    #007acc   (bottom bar)
bg-ide-activitybar  #333333
```

Never use hardcoded hex colors in components — always use `ide-*` tokens.

## Security

- `safeStorage` (OS keychain) for all credentials — never store plaintext
- Credentials never sent to renderer after save; only `connectionId` crosses IPC
- CSP set in `src/main/index.ts` `setupCsp()`
- Files > 5 MB: warn user before downloading (checked in `sftp.ipc.ts`)

## How to Add a New IPC Channel

1. Add method to `IRemoteApi` in `src/renderer/domain/ports/IRemoteApi.ts`
2. Add implementation in `src/preload/index.ts` (ipcRenderer.invoke)
3. Add handler in the appropriate `src/main/infrastructure/ipc/*.ipc.ts`
4. Register the handler in `src/main/index.ts`
5. Call via `getRemoteApi().domain.action()` in renderer code

## How to Add a New SSH/SFTP Operation

1. Add method signature to `src/main/domain/ports/ISftpService.ts` (or ISshClient)
2. Implement in `src/main/adapters/sftp/Ssh2SftpService.ts`
3. Expose via IPC following the pattern above

## How to Add a New UI Panel

1. Create component in `src/renderer/ui/components/<feature>/`
2. Add an activity bar entry in `ActivityBar.tsx`
3. Wire it in the sidebar switch in `App.tsx`
4. Use `useApp()` for session/connection state, `useEditor()` for file state

## Testing

### Unit Tests (Vitest + React Testing Library)

Config: `vitest.config.ts` — runs in `jsdom`, includes `src/renderer/**/*.test.tsx`.

```
src/renderer/__tests__/
  setup.ts                     ← @testing-library/jest-dom import
  helpers/
    mockApi.ts                 ← createMockApi() factory (IRemoteApi mock)
    mocks.ts                   ← vi.mock for @monaco-editor/react and @xterm/*
    renderWithProviders.tsx    ← wraps UI with AppProvider + EditorProvider
src/renderer/ui/components/<feature>/__tests__/<Component>.test.tsx
```

**Mock pattern for window.api:**
```typescript
beforeEach(() => { vi.stubGlobal('api', createMockApi()) })
afterEach(() => { vi.unstubAllGlobals() })
```

**Mock pattern for contexts (when you need to control activeSession etc.):**
```typescript
vi.mock('../../../../application/contexts/AppContext', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useApp: vi.fn() }
})
vi.mocked(useApp).mockReturnValue({ activeSession: mockSession, ... })
```

### E2E Tests (Playwright + Electron)

Config: `playwright.config.ts` — runs specs in `tests/e2e/`.
Helper: `tests/e2e/helpers/electronApp.ts` — `launchApp()` / `closeApp()`.

SSH tests require environment variables:
```
E2E_SSH_HOST=127.0.0.1   E2E_SSH_USER=user   E2E_SSH_PASS=pass
```
Tests without those env vars are automatically skipped.

## Common Mistakes to Avoid

- Do NOT import `electron`, `ssh2`, `fs`, or `path` in any renderer file
- Do NOT import from `src/main/` in `src/renderer/` (or vice versa)
- Do NOT call `window.api` directly — always go through `getRemoteApi()` so the
  adapter can be swapped for tests
- Do NOT add business logic to IPC handlers — they call use cases/services, not implement logic
- Do NOT store encrypted credentials anywhere except `electron-store` via `SafeStorageCrypto`
