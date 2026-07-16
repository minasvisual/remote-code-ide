## Why

The file explorer currently supports rename, delete, upload, and download, but there is no way to duplicate a
remote file or folder, or move a copy of it into another remote directory, without downloading and
re-uploading it manually. A Copy/Paste pair in the context menu closes that gap using the same interaction
model users already expect from desktop file managers.

## What Changes

- Add a **Copy** item to the context menu for both files and directories in the explorer tree. Selecting it
  stores a reference (session, path, name, type) to the clicked item in memory — nothing is transferred yet.
- Add a **Paste** item to the context menu for directories, and to a new background context menu on empty
  space in the explorer (targets the tree root, with no folder node selected). It appears exclusively when
  something has been copied. Selecting it copies the remembered file/folder into the target directory,
  entirely server-side over the existing SFTP connection (no local download/upload round-trip).
- The copied reference stays in memory until the user copies something else (or disconnects), so it can be
  pasted into multiple directories without repeating "Copy".
- For folders, copying and pasting is recursive — the entire subtree (files and nested subdirectories) is
  duplicated at the destination.
- If an item with the same name already exists at the destination, the user is asked to confirm via a
  dialog before it is overwritten — pasting never fails outright and never overwrites silently.
- Pasting a folder into itself or into one of its own subfolders is rejected with a clear error, since that
  would corrupt the copy.
- Add a new `ISftpService.copy()` operation (and `sftp:copy` IPC channel) that performs the recursive
  server-side copy, with an overwrite-confirmation flow.

Out of scope for this change: cross-session/cross-server paste (the app has one active SSH session at a
time, so this isn't reachable today), a "Cut" operation, a Paste option on a file's own context menu (Paste
always targets a directory), and merging directory contents on overwrite (an overwritten folder is replaced
wholesale, not merged file-by-file).

## Capabilities

### New Capabilities
- `explorer-copy-paste`: Copy/Paste interaction in the file explorer — the in-memory clipboard, recursive
  folder copy, the directory and root/background "Paste" targets, the overwrite-confirmation dialog, and the
  self/subfolder paste guard.

### Modified Capabilities
- `sftp-operations`: adds a new server-side recursive copy operation (`sftp:copy`) alongside the existing
  list/read/write/rename/mkdir/delete operations.

## Impact

- `src/main/domain/ports/ISftpService.ts` — new `copy()` method signature
- `src/main/adapters/sftp/Ssh2SftpService.ts` — recursive copy implementation over SFTP streams
- `src/main/infrastructure/ipc/sftp.ipc.ts` — new `sftp:copy` handler
- `src/renderer/domain/ports/IRemoteApi.ts` — new `sftp.copy()` entry
- `src/preload/index.ts` — bridge for `sftp:copy`
- `src/renderer/application/contexts/AppContext.tsx` — new clipboard state and actions
- `src/renderer/ui/components/explorer/TreeNode.tsx` — new Copy/Paste context menu items, overwrite
  confirmation `Modal`
- `src/renderer/ui/components/explorer/FileExplorer.tsx` — new background context menu for root-level Paste
- No new dependencies; no breaking changes to existing IPC channels or components.
