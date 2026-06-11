## 1. Backend — SFTP service and IPC

- [x] 1.1 Add `createFile(sessionId: string, path: string): Promise<void>` to `ISftpService` port interface
- [x] 1.2 Implement `createFile` in `Ssh2SftpService`: call `sftp.stat(path)` first — if the file exists throw `Object.assign(new Error('File already exists'), { code: 'FILE_EXISTS' })`; otherwise write an empty Buffer
- [x] 1.3 Add `sftp:createFile` IPC handler in `sftp.ipc.ts`; propagate `FILE_EXISTS` error code in the response payload so the renderer can distinguish it from generic errors
- [x] 1.4 Register `sftp:createFile` handler in `src/main/index.ts`

## 2. Preload and renderer API surface

- [x] 2.1 Add `sftp.createFile(sessionId, path): Promise<void>` to `IRemoteApi` in `src/renderer/domain/ports/IRemoteApi.ts`
- [x] 2.2 Expose `sftp.createFile` in `src/preload/index.ts` via `ipcRenderer.invoke('sftp:createFile', ...)`

## 3. NewFileDialog component

- [x] 3.1 Create `src/renderer/ui/components/commons/NewFileDialog.tsx` — modal with filename input, Cancel and Create buttons
- [x] 3.2 Validate input: reject empty/whitespace and filenames containing `/`; handle `FILE_EXISTS` error code from the API by setting an inline error message in the dialog (do not dismiss)
- [x] 3.3 Auto-focus the input on open; support Enter to submit and Escape to cancel
- [x] 3.4 Write unit test `src/renderer/ui/components/commons/__tests__/NewFileDialog.test.tsx` covering: renders, validation rejects empty, validation rejects slash, onConfirm called with trimmed name, onCancel closes, `FILE_EXISTS` error shows inline message without dismissing dialog

## 4. FileExplorer root toolbar button

- [x] 4.1 Add "New File" button (e.g. `+` icon) in the `FileExplorer` toolbar next to the Refresh button
- [x] 4.2 Wire button to open `NewFileDialog` targeting `activeSession.initialDirectory || '/'`
- [x] 4.3 On dialog confirm: call `api.sftp.createFile`; on `FILE_EXISTS` set inline dialog error; on other error call `notify('error', ...)` and close dialog; on success call `load()` to reload root from server

## 5. Folder context menu entry in TreeNode

- [x] 5.1 Add "New File" item to the `ContextMenu` items array for directory nodes only (conditionally included based on `node.type === 'directory'`)
- [x] 5.2 Wire "New File" context menu item to open `NewFileDialog` targeting `node.path`
- [x] 5.3 On dialog confirm: call `api.sftp.createFile`; on `FILE_EXISTS` set inline dialog error; on other error call `notify('error', ...)` and close dialog; on success call `api.sftp.listDir(sessionId, node.path)`, update `children` state with the result, set `loaded = true`, and expand the folder

## 6. Tests

- [x] 6.1 Update `src/renderer/__tests__/helpers/mockApi.ts` to include `sftp.createFile` mock
- [x] 6.2 Add unit tests in `TreeNode.test.tsx` for: "New File" appears in directory context menu, "New File" absent from file context menu, successful creation triggers listDir and updates children, `FILE_EXISTS` shows inline dialog error, other SFTP error shows notification
