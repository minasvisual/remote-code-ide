## Why

The file explorer currently has no way to create new files directly — users must create files externally or via the terminal. Adding a "New File" action to the explorer toolbar and folder context menus closes this gap and makes the IDE self-sufficient for day-to-day file management.

## What Changes

- Add a **New File** button to the file explorer root toolbar (next to the existing Refresh button)
- Add a **New File** entry to folder context menus in the file tree
- When triggered, open a modal dialog with a filename input field; on submit, check if the filename already exists in the target directory and block creation with an inline error if so
- Create an empty file at the target path via SFTP only when the filename is confirmed to be free
- After successful creation, refresh the target directory's contents from the server to reflect the actual remote state

## Capabilities

### New Capabilities
- `file-explorer-new-file`: UI affordance (toolbar button + folder context menu entry + filename dialog) and creation flow for new empty remote files

### Modified Capabilities
- `sftp-operations`: Add requirement for creating a new empty remote file with create-if-not-exists guard — `createFile` SHALL reject with a `FILE_EXISTS` error when the target path already exists, instead of silently overwriting

## Impact

- `src/renderer/ui/components/explorer/FileExplorer.tsx` — adds New File button to root toolbar
- `src/renderer/ui/components/explorer/TreeNode.tsx` — adds New File option in folder context menu
- `src/renderer/ui/components/commons/` — new `NewFileDialog` modal component (or reuse existing Modal)
- `src/main/domain/ports/ISftpService.ts` — add `createFile(sessionId, remotePath): Promise<void>`
- `src/main/adapters/sftp/Ssh2SftpService.ts` — implement `createFile` using `writeFile` with empty buffer
- `src/main/infrastructure/ipc/sftp.ipc.ts` — register `sftp:createFile` IPC handler
- `src/preload/index.ts` — expose `sftp.createFile` on the contextBridge
- `src/renderer/domain/ports/IRemoteApi.ts` — add `sftp.createFile` to the API surface
