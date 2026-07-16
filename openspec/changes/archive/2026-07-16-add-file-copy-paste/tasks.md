## 1. Domain port

- [x] 1.1 Add `copy(sessionId: string, sourcePath: string, destPath: string, type: 'file' | 'directory', overwrite?: boolean): Promise<void>` to `src/main/domain/ports/ISftpService.ts`. Throws an error with `code: 'DEST_EXISTS'` when the destination already exists and `overwrite` is not `true`.

## 2. Main adapter: recursive SFTP copy

- [x] 2.1 In `Ssh2SftpService`, add a private helper that checks whether a destination path exists (`stat`)
- [x] 2.2 Add the self/subfolder guard: reject when `destPath === sourcePath` or `destPath.startsWith(sourcePath + '/')` before doing any I/O or existence check, for both files and directories
- [x] 2.3 Implement `copyFile(sessionId, sourcePath, destPath)`: pipe `sftp.createReadStream(sourcePath)` into `sftp.createWriteStream(destPath)`, following the same promise/settle pattern used in `downloadFile`
- [x] 2.4 Implement `copy(sessionId, sourcePath, destPath, type, overwrite = false)`:
  - apply the self-paste guard first
  - `stat` the destination; if it exists and `overwrite` is `false`, throw `{ code: 'DEST_EXISTS' }` without touching anything
  - if it exists and `overwrite` is `true`, remove it first (`delete` for a file, `deleteRecursive` for a directory)
  - for `type === 'file'`, call `copyFile`
  - for `type === 'directory'`, `mkdir` the destination, `listDir` the source, and recurse into `copy()` for each child with `overwrite` forced to `true` (the top-level existence check already happened; children of a freshly created directory can't collide)
- [x] 2.5 Add `log(...)` calls consistent with the existing logging style in `Ssh2SftpService.ts`

## 3. IPC handler

- [x] 3.1 Add `sftp:copy` handler in `src/main/infrastructure/ipc/sftp.ipc.ts` that calls `sftp.copy(sessionId, sourcePath, destPath, type, overwrite)` and lets errors propagate, preserving the `code` property on `DEST_EXISTS` errors (same shape as the existing `sftp:createFile` `FILE_EXISTS` handling)
- [x] 3.2 No changes needed to `src/main/index.ts` — `registerSftpIpc` is already wired with the `ISftpService` instance

## 4. Preload + renderer API port

- [x] 4.1 Add `copy(sessionId: string, sourcePath: string, destPath: string, type: 'file' | 'directory', overwrite?: boolean): Promise<void>` to the `sftp` section of `src/renderer/domain/ports/IRemoteApi.ts`, throwing an `Error` with `.code === 'DEST_EXISTS'` on conflict (mirroring how `createFile` surfaces `FILE_EXISTS` today)
- [x] 4.2 Add the corresponding `ipcRenderer.invoke('sftp:copy', ...)` bridge in `src/preload/index.ts`

## 5. Clipboard state in AppContext

- [x] 5.1 Add a `ClipboardEntry` type (`{ sessionId: string; path: string; name: string; type: 'file' | 'directory' }`) and `clipboard: ClipboardEntry | null` state to `AppContext.tsx`
- [x] 5.2 Add `copyToClipboard(entry: ClipboardEntry): void` and `clearClipboard(): void` actions, exposed on `AppContextValue`
- [x] 5.3 Clear the clipboard inside the existing `disconnect()` flow and inside the `api.ssh.onDisconnected` handler, alongside the existing `setActiveSession(null)` / `setTerminalTargetDir(null)` resets

## 6. Shared paste logic

- [x] 6.1 Extract a small shared helper (e.g. a `usePaste` hook or a plain function taking `{ api, notify, clipboard }`) usable from both `TreeNode.tsx` and `FileExplorer.tsx`, since both need the identical attempt → `DEST_EXISTS` → confirm → retry-with-overwrite flow described in design.md Decision 2
- [x] 6.2 The helper calls `api.sftp.copy(clipboard.sessionId, clipboard.path, targetDir, clipboard.type, false)`; on success it reports the pasted name via `notify('success', ...)` and signals the caller to refresh; on a `DEST_EXISTS` error it returns/exposes enough state (target dir, clipboard name) for the caller to render a confirmation `Modal`; confirming calls `api.sftp.copy(..., true)`, cancelling does nothing further

## 7. Explorer context menu: Copy / Paste (directories)

- [x] 7.1 In `TreeNode.tsx`, add a "Copy" entry to the common `contextMenuItems` array (visible for both files and directories) that calls `copyToClipboard({ sessionId, path: node.path, name: node.name, type: node.type })` and `notify('info', ...)`
- [x] 7.2 In `TreeNode.tsx`, add a "Paste" entry to the directory-only section of `contextMenuItems`, rendered only when `clipboard` is non-null and `clipboard.sessionId === sessionId`
- [x] 7.3 Wire "Paste" to the shared paste helper from task 6, targeting `node.path`; on success, refresh via the existing `doRefresh()` (if this directory node is already loaded) or by surfacing the target through the parent `refreshTarget` mechanism, matching `handleUploadDialogClose` in `FileExplorer.tsx`
- [x] 7.4 Render the overwrite-confirmation `Modal` (Cancel / "Overwrite" `Button`s, same composition as the existing delete-confirmation `Modal` in this file) when the paste helper reports a `DEST_EXISTS` conflict for this node

## 8. Explorer background context menu: Paste at root

- [x] 8.1 In `FileExplorer.tsx`, add local `contextMenu: { x, y } | null` state and an `onContextMenu` handler on the scrollable root container (the `flex-1 overflow-y-auto` div) that opens it; rely on `TreeNode`'s existing `e.stopPropagation()` in its own `handleContextMenu` so row right-clicks never reach this handler
- [x] 8.2 Render the existing `ContextMenu` component with a single "Paste" item, shown only when `clipboard` is non-null, targeting `rootDir = activeSession.initialDirectory || '/'`
- [x] 8.3 Wire it to the same shared paste helper from task 6; on success, call `load()` directly (matching the existing `targetDir === '/'` branch in `handleUploadDialogClose`) instead of using `refreshTarget`
- [x] 8.4 Render the same overwrite-confirmation `Modal` pattern as task 7.4 for the root paste target

## 9. Tests

- [x] 9.1 Add/extend `src/renderer/ui/components/explorer/__tests__/TreeNode.test.tsx` to cover: "Copy" always present, "Paste" absent with empty clipboard, "Paste" present with a matching-session clipboard entry, a successful paste calling `api.sftp.copy` with `overwrite: false`, and a `DEST_EXISTS` response opening the confirmation modal followed by a confirmed retry with `overwrite: true`
- [x] 9.2 Add/extend `src/renderer/ui/components/explorer/__tests__/FileExplorer.test.tsx` to cover the background context menu: no "Paste" with empty clipboard, "Paste" present with a clipboard entry, and a right-click on a tree row not triggering the background menu
- [x] 9.3 Extend `createMockApi()` in `src/renderer/__tests__/helpers/mockApi.ts` with a `sftp.copy` mock (including a way to make it reject with `{ code: 'DEST_EXISTS' }`)
- [x] 9.4 Add unit coverage (or extend existing main-process tests, if any exist for `Ssh2SftpService`) for: the `DEST_EXISTS` rejection path, the overwrite-then-copy path (file and directory), recursive directory copy, and the self/subfolder paste guard

## 10. Manual verification

- [x] 10.1 `npm run typecheck` (pre-existing repo-wide test-file typing gap unrelated to this change confirmed via baseline diff on `main`; all production code touched by this change typechecks cleanly — zero errors in non-test files)
- [x] 10.2 `npm run test:unit` (178/178 tests passing across 22 files, including new Ssh2SftpService, TreeNode, and FileExplorer coverage)
- [ ] 10.3 Against a real/test SSH session: copy a file, paste into another folder, paste again into a second folder from the same clipboard entry, copy and paste a folder with nested subfolders (verify the full subtree is duplicated), attempt to paste a folder into itself (expect a rejection, no dialog), paste into a folder that already has a same-named item (expect the overwrite confirmation dialog, verify both Cancel and Confirm behavior), and paste at the explorer root via the background context menu with no folder selected
