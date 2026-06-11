## 1. Main Process — IPC and SFTP

- [x] 1.1 Add `uploadFile(sessionId: string, remotePath: string, content: Buffer): Promise<void>` to `ISftpService` (same as `writeFile` but makes intent explicit — can alias internally)
- [x] 1.2 Add `mkdirp(sessionId: string, path: string): Promise<void>` to `ISftpService` — creates a path recursively, silently ignoring "already exists" errors
- [x] 1.3 Implement `mkdirp` in `Ssh2SftpService.ts` (split path into segments, call `mkdir` for each, swallow `EEXIST`/code 4 errors)
- [x] 1.4 Register `sftp:openUploadDialog` IPC handler in `sftp.ipc.ts` — opens Electron `dialog.showOpenDialog` with `openFile`, `openDirectory`, `multiSelections` properties, returns selected paths or `null` on cancel
- [x] 1.5 Register `sftp:uploadFiles` IPC handler in `sftp.ipc.ts` — accepts `{ sessionId, targetDir, localPaths: string[] }`, recursively walks local paths using `fs`, creates remote dirs with `mkdirp`, uploads each file with `writeFile`, sends `sftp:uploadProgress` events per file
- [x] 1.6 Implement the recursive local path walker utility in `sftp.ipc.ts` (or a helper) — for each path, if directory recurse; if file, yield `{ localPath, relativePath }` pairs
- [x] 1.7 Add `sftp:openUploadDialog` and `sftp:uploadFiles` channel registration in `src/main/index.ts`

## 2. Preload — Expose Upload API

- [x] 2.1 Add `sftp.openUploadDialog(): Promise<string[] | null>` to `src/preload/index.ts`
- [x] 2.2 Add `sftp.uploadFiles(sessionId: string, targetDir: string, localPaths: string[]): Promise<void>` to `src/preload/index.ts`
- [x] 2.3 Add `sftp.onUploadProgress(callback: (event: UploadProgressEvent) => void): () => void` to `src/preload/index.ts` (returns unsubscribe function, wraps `ipcRenderer.on` / `removeListener`)

## 3. Renderer — Type Contracts

- [x] 3.1 Add `UploadProgressEvent` type to renderer domain (or shared types): `{ localPath: string; remoteName: string; status: 'uploading' | 'done' | 'error'; error?: string }`
- [x] 3.2 Add `openUploadDialog`, `uploadFiles`, and `onUploadProgress` to `IRemoteApi` in `src/renderer/domain/ports/IRemoteApi.ts`
- [x] 3.3 Update `createMockApi()` in `src/renderer/__tests__/helpers/mockApi.ts` with stub implementations for the three new methods

## 4. Upload Dialog Component

- [x] 4.1 Create `src/renderer/ui/components/commons/UploadDialog.tsx` — modal that accepts `entries: UploadEntry[]` (each with `remoteName`, `status`, `error?`), shows a scrollable list, and a "Close" button enabled only when no entry has status `uploading` or `pending`
- [x] 4.2 Render per-entry status icons/labels: pending (muted text), uploading (spinner), done (checkmark green), error (red with error message)
- [x] 4.3 Prevent modal from closing on outside click while upload is in progress (pass `disableBackdropClose` or equivalent guard)

## 5. File Explorer — Toolbar Upload Button

- [x] 5.1 Add Upload toolbar button to `FileExplorer.tsx` header row — folder with arrow-up SVG icon, `title="Upload"`, positioned alongside existing New File / New Folder / Refresh buttons
- [x] 5.2 Implement `handleUpload(targetDir: string)` in `FileExplorer.tsx`:
  - call `api.sftp.openUploadDialog()` → if null, return early
  - subscribe to `api.sftp.onUploadProgress` to update entry statuses in state
  - call `api.sftp.uploadFiles(sessionId, targetDir, paths)` (fire and collect via progress events)
  - open `UploadDialog` during upload; on dialog close, trigger tree refresh
- [x] 5.3 Wire toolbar button to `handleUpload(rootDir)` where `rootDir = activeSession.initialDirectory || '/'`

## 6. File Explorer — Context Menu Upload Option

- [x] 6.1 In `TreeNode.tsx`, add "Upload here" item to the context menu items array, placed after "New Folder" (if present) and before or after a divider
- [x] 6.2 Determine target directory based on node type: if `node.type === 'directory'` use `node.path`; otherwise use `node.path.substring(0, node.path.lastIndexOf('/')) || '/'`
- [x] 6.3 Wire "Upload here" click to the same `handleUpload(targetDir)` logic — either extract to a shared hook or pass down as a prop from `FileExplorer`
- [x] 6.4 After upload completes successfully, trigger `doRefresh()` on the relevant tree node so newly uploaded files appear

## 7. Tree Refresh After Upload

- [x] 7.1 After `UploadDialog` is dismissed (all done), call `load()` in `FileExplorer` to refresh the root-level listing
- [x] 7.2 If upload targeted a subdirectory (from context menu), propagate a refresh signal to that specific `TreeNode` (use `refreshSignal` prop pattern already in use or trigger via `doRefresh`)

## 8. Tests

- [x] 8.1 Unit test `UploadDialog.tsx`: verify "Close" is disabled while entries have pending/uploading status, enabled when all are done/error
- [x] 8.2 Unit test `FileExplorer.tsx`: verify Upload button renders and calls `openUploadDialog` on click (mock `api.sftp.openUploadDialog` returning `null` to test cancel path)
- [x] 8.3 Unit test `TreeNode.tsx`: verify "Upload here" appears in context menu for both file and directory nodes, with correct target directory derived
