# Preload — Agent Guide

The preload script is the **only bridge** between main and renderer.
It uses `contextBridge.exposeInMainWorld('api', ...)` to expose a typed surface.

## Rules

- Zero business logic here — only `ipcRenderer.invoke` / `ipcRenderer.send` calls
- Every method in `window.api` must match a method in `IRemoteApi` (renderer side)
  and a registered `ipcMain.handle` / `ipcMain.on` (main side)
- `ipcRenderer.invoke` → for async request/response (use for everything except terminal I/O)
- `ipcRenderer.send` → for fire-and-forget (terminal input, terminal resize)
- `ipcRenderer.on` → for push events from main (terminal output, session disconnected)

## Adding a New Method

```typescript
// 1. Add to IRemoteApi in src/renderer/domain/ports/IRemoteApi.ts
myDomain: {
  doAction(param: string): Promise<MyResult>
}

// 2. Add to contextBridge in src/preload/index.ts
myDomain: {
  doAction: (param) => ipcRenderer.invoke('myDomain:doAction', param)
}

// 3. Register handler in src/main/infrastructure/ipc/myDomain.ipc.ts
ipcMain.handle('myDomain:doAction', async (_e, param: string) => { ... })

// 4. Call registerMyDomainIpc(...) in src/main/index.ts
```

## Event Listeners (push from main to renderer)

```typescript
// In preload:
onMyEvent: (cb) => {
  ipcRenderer.on('myDomain:myEvent', (_e, data) => cb(data))
}

// In main (push side):
BrowserWindow.getAllWindows().forEach(w => w.webContents.send('myDomain:myEvent', data))
```
