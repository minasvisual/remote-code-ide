## 1. Backend — Recursive Delete

- [x] 1.1 Add `deleteRecursive(sessionId: string, path: string): Promise<void>` to `src/main/domain/ports/ISftpService.ts`
- [x] 1.2 Implement `deleteRecursive` in `src/main/adapters/sftp/Ssh2SftpService.ts`: call `listDir` on the path, recursively call `deleteRecursive` for subdirectories and `sftp.unlink` for files (depth-first), then call `sftp.rmdir` on the now-empty directory
- [x] 1.3 Add `ipcMain.handle('sftp:deleteRecursive', ...)` in `src/main/infrastructure/ipc/sftp.ipc.ts` delegating to `sftp.deleteRecursive(sessionId, path)`
- [x] 1.4 Add `deleteRecursive(sessionId: string, path: string): Promise<void>` to `IRemoteApi` in `src/renderer/domain/ports/IRemoteApi.ts` under the `sftp` namespace
- [x] 1.5 Wire `deleteRecursive` in `src/preload/index.ts`: `deleteRecursive: (sessionId, path) => ipcRenderer.invoke('sftp:deleteRecursive', sessionId, path)`

## 2. ContextMenu Component

- [x] 2.1 Create `src/renderer/ui/components/commons/ContextMenu.tsx` — accepts `items: { label: string; onClick: () => void }[]`, `position: { x: number; y: number }`, and `onClose: () => void`; renders as absolutely-positioned div with `z-[9999]`; uses `ide-*` tokens; dismisses on outside click and `Escape`

## 3. TreeNode — Context Menu Integration

- [x] 3.1 Add `onDelete?: (node: FileNode) => void` and `onRename?: (node: FileNode, newName: string) => void` optional callback props to `TreeNode`'s `Props` interface
- [x] 3.2 Add state for context menu visibility and position to `TreeNode`: `contextMenu: { x: number; y: number } | null`
- [x] 3.3 Add `onContextMenu` handler to the node row div — calls `e.preventDefault()`, sets `contextMenu` position state, and stops propagation
- [x] 3.4 Render `<ContextMenu>` when `contextMenu` state is non-null, with "Rename" and "Delete" items; pass `onClose` that clears the state
- [x] 3.5 Propagate `onDelete` and `onRename` callbacks down to child `TreeNode` instances in the recursive render

## 4. Delete Action

- [x] 4.1 Add `deleteTarget: FileNode | null` state to `TreeNode` for controlling the confirmation modal
- [x] 4.2 When "Delete" is clicked in the context menu: close context menu and set `deleteTarget` to the node
- [x] 4.3 Render `<Modal>` (existing component) when `deleteTarget` is non-null with a message that depends on node type:
  - **File:** `Delete "${node.name}"? This action cannot be undone.`
  - **Folder:** `This will permanently delete the folder "${node.name}" and ALL its contents. This cannot be undone.`
- [x] 4.4 On Confirm for a **file**: call `api.sftp.delete(sessionId, node.path)`; on success call `onDelete?.(node)`, on failure `notify('error', ...)`; clear `deleteTarget`
- [x] 4.5 On Confirm for a **directory**: call `api.sftp.deleteRecursive(sessionId, node.path)`; on success call `onDelete?.(node)`, on failure `notify('error', ...)`; clear `deleteTarget`
- [x] 4.6 On Cancel: clear `deleteTarget` only

## 5. Rename Action

- [x] 5.1 Add `isRenaming: boolean` and `renameValue: string` state to `TreeNode`
- [x] 5.2 When "Rename" is clicked in the context menu: close context menu, set `isRenaming = true` and `renameValue = node.name`
- [x] 5.3 When `isRenaming` is true, replace the node label `<span>` with an `<input>` (using existing `Input.tsx` or inline `<input>` styled with `ide-*` tokens), pre-filled with `renameValue`, auto-focused
- [x] 5.4 On `Enter` keydown or `onBlur`: validate non-empty; call `api.sftp.rename(sessionId, node.path, newPath)` where `newPath` is the parent dir + new name; on success call `onRename?.(node, newName)`; on failure `notify('error', ...)`; set `isRenaming = false`
- [x] 5.5 On `Escape` keydown: set `isRenaming = false` without any SFTP call
- [x] 5.6 On empty input submit: set `isRenaming = false`, show `notify('error', 'Name cannot be empty')`, no SFTP call

## 6. FileExplorer — Wire Callbacks

- [x] 6.1 In `FileExplorer.tsx`, add `handleDelete(node: FileNode)` that removes the node from the root children state
- [x] 6.2 In `FileExplorer.tsx`, add `handleRename(node: FileNode, newName: string)` that updates the node's `name` and `path` in the root children state
- [x] 6.3 Pass `onDelete={handleDelete}` and `onRename={handleRename}` to the top-level `<TreeNode>` instances

## 7. Tests

- [x] 7.1 Write unit test for `ContextMenu.tsx`: renders items, calls `onClose` on outside click and Escape, calls item `onClick`
- [x] 7.2 Write unit test for `TreeNode` delete file flow: right-click → context menu → confirm → `api.sftp.delete` called, `onDelete` called
- [x] 7.3 Write unit test for `TreeNode` delete folder flow: right-click → context menu → confirm dialog shows recursive warning → `api.sftp.deleteRecursive` called, `onDelete` called
- [x] 7.4 Write unit test for `TreeNode` delete cancel: right-click → context menu → cancel → no SFTP call
- [x] 7.5 Write unit test for `TreeNode` rename flow: right-click → context menu → Enter with new name → `api.sftp.rename` called, `onRename` called
- [x] 7.6 Write unit test for `TreeNode` rename cancel (Escape): no SFTP call, label reverts
- [x] 7.7 Write unit test for `TreeNode` rename empty: no SFTP call, error notification shown
