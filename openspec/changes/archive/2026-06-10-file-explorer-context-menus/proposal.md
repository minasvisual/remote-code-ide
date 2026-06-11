## Why

Users need a way to manage files and folders on the connected remote server directly from the file explorer tree, without having to open a terminal. Delete and rename are the most fundamental file management operations and currently missing from the UI.

## What Changes

- Right-clicking a file or folder in the file explorer tree opens a context menu
- Context menu for **files** contains: Rename, Delete
- Context menu for **folders** contains: Rename, Delete
- Delete action shows a confirmation dialog before executing the SFTP delete
  - Deleting a **file** calls `sftp.unlink` on that path
  - Deleting a **folder** performs recursive deletion (list all contents, delete each entry depth-first, then rmdir) and explicitly warns the user in the confirmation message that all contents will be permanently removed
- Rename action prompts inline (or via a modal) for the new name and issues the SFTP rename

## Capabilities

### New Capabilities

- `file-explorer-context-menu`: Right-click context menu on file/folder tree nodes with Rename and Delete actions, including confirmation dialog for destructive operations

### Modified Capabilities

<!-- No existing spec-level requirements are changing -->

## Impact

- `src/renderer/ui/components/explorer/` — TreeNode component gains right-click handler and context menu rendering
- `src/renderer/ui/components/commons/` — new ContextMenu and ConfirmDialog (or reuse existing Modal) components
- `src/renderer/domain/ports/IRemoteApi.ts` — `sftp.rename` already exists; `sftp.deleteRecursive` must be added
- `src/preload/index.ts` — wire `sftp:deleteRecursive` IPC channel
- `src/main/infrastructure/ipc/sftp.ipc.ts` — add `sftp:deleteRecursive` handler (files use existing `sftp:delete`)
- `src/main/domain/ports/ISftpService.ts` — add `deleteRecursive(sessionId, path): Promise<void>`
- `src/main/adapters/sftp/Ssh2SftpService.ts` — implement `deleteRecursive`: listDir → depth-first delete each entry → rmdir
