## Context

The file explorer (`FileExplorer.tsx` + `TreeNode.tsx`) already supports rename, delete, and mkdir via SFTP. The existing `ISftpService` has `writeFile(sessionId, path, Buffer)` which can create a file if the path doesn't exist. The renderer's `IRemoteApi` exposes a matching `sftp.writeFile`. There is no dedicated "create empty file" IPC surface today.

The UI already uses `ContextMenu` (for right-click on nodes) and `Modal` (for delete confirmation). These primitives are reusable for the new file dialog.

## Goals / Non-Goals

**Goals:**
- "New File" button in the FileExplorer root toolbar (target: `initialDirectory || '/'`)
- "New File" entry in folder context menus in TreeNode (target: that folder's path)
- Modal dialog with a filename input; Enter or button submits
- Empty file created via `sftp:createFile` only after verifying the filename is free; inline error in dialog if already exists
- After creation, target directory contents refreshed from the server (listDir)

**Non-Goals:**
- "New Folder" button/menu (already exists via `sftp:mkdir`; a future change can add similar UI)
- Nested path input (e.g. `subdir/file.ts`) — filename only, no slash
- Opening the file in the editor automatically after creation
- Overwrite confirmation flow — existence check is a hard block, not a prompt

## Decisions

### 1. Dedicated `createFile` port method instead of reusing `writeFile`

`writeFile` is semantically "save edited content"; calling it with an empty buffer for file creation would blur that intent and create confusion in tests. A new `createFile(sessionId, path)` method on `ISftpService` makes intent explicit. The adapter implementation first calls `sftp.stat(path)` to check for existence; if the file exists it throws `{ code: 'FILE_EXISTS' }`. Otherwise it writes an empty buffer. No new SFTP protocol command needed beyond `stat` + `write`.

**Alternative rejected:** Calling `sftp.writeFile(sessionId, path, '')` from the renderer. This leaks "create = write empty" semantics into the UI layer, and bypasses the explicit IPC surface contract.

### 2. New IPC channel `sftp:createFile`

Following the existing pattern (`sftp:mkdir`, `sftp:delete`), a dedicated channel `sftp:createFile(sessionId, path)` is registered. The preload and `IRemoteApi` are extended with `sftp.createFile`.

### 3. `NewFileDialog` as a standalone commons component

The dialog (title, filename input, Cancel/Create buttons) is reusable and straightforward to test in isolation. It lives in `src/renderer/ui/components/commons/NewFileDialog.tsx`. It renders a `Modal` internally and calls an `onConfirm(filename: string)` prop. Validation: non-empty, no `/` characters.

**Alternative rejected:** Inline state inside `FileExplorer` and `TreeNode`. Both components would need to duplicate dialog state; extraction to a shared component is cleaner.

### 4. Tree refresh strategy — server-side listDir for both cases

After a successful creation the target directory's contents are reloaded from the server via `api.sftp.listDir(sessionId, targetPath)`, not via optimistic client-side append.

- **Root toolbar "New File"**: calls `load()` (already does `listDir('/')`) — unchanged.
- **Folder context menu "New File"**: calls `api.sftp.listDir(sessionId, node.path)`, sets `children` to the result, sets `loaded = true`. If the folder was collapsed it is expanded after the reload.

**Why server reload over direct append:** Optimistic append assumes exact serialisation of the new node (`name`, `path`, `type`, `isLoaded`). A server-side reload is one extra round-trip but gives accurate results — other files created concurrently (e.g. by the terminal) become visible too, and it eliminates any state divergence bugs.

**Alternative rejected:** Direct append of the constructed `FileNode`. Avoids the round-trip but requires replicating server-side node shape in the UI and can silently diverge from server state.

### 5. Duplicate detection — server-side error, surfaced inline in dialog

The `Ssh2SftpService.createFile` implementation calls `sftp.stat(path)` before writing. If `stat` succeeds (file exists), it throws `Object.assign(new Error('File already exists'), { code: 'FILE_EXISTS' })`. The IPC handler propagates this error code. The dialog's submit handler inspects the error code; if `FILE_EXISTS`, it sets an inline validation message ("A file named X already exists") rather than dismissing.

**Alternative rejected:** Client-side check by scanning known `children` state. Would miss files created outside the editor and requires parents to pass children lists into the dialog.

## Risks / Trade-offs

- **stat race condition**: Between the `stat` check and the `write`, another process could create the file. The window is small; a second write would succeed silently. Acceptable for v1 — this is a developer tool, not a concurrent-write system.
- **Root toolbar target path**: Uses `activeSession.initialDirectory || '/'`. If the user's initial directory is a restricted path, creation may fail. Existing error notification pattern handles this gracefully.
- **Dialog input validation**: Only prevents empty names and `/` in the filename. More thorough validation (OS-reserved characters) is out of scope; the server will reject invalid names and the error notification surfaces it.
- **listDir round-trip on success**: Folder context menu creation triggers a `listDir` call after write. In slow connections this adds latency. Mitigation: the folder was already loaded once, so this is a refresh, not an initial load — acceptable UX cost for accuracy.
