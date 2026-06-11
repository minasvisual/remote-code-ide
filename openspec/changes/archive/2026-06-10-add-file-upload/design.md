## Context

MyCODEany communicates between renderer and main via contextBridge IPC. The renderer has no `fs` access. Electron's `dialog.showOpenDialog` runs in the main process. SFTP transfers happen through `ssh2` in the main process via `ISftpService`.

Existing patterns used as reference:
- Terminal output: `ipcMain.on` + `webContents.send` for push events (progress model)
- Context menu: `ContextMenu` component in `commons/`, items wired per-node in `TreeNode`
- Explorer toolbar: icon buttons in `FileExplorer` header row

## Goals / Non-Goals

**Goals:**
- Allow users to upload one or more files or folders from their local machine to any directory on the remote server
- Show real-time per-file upload progress in a modal dialog
- Support recursive folder upload (preserve directory structure remotely)
- Overwrite existing remote files without prompting
- Add upload action to both the explorer root toolbar and the TreeNode context menu

**Non-Goals:**
- Pause/resume or cancel in-flight uploads
- Upload progress as a percentage (byte-level streaming) — file-level completion is sufficient for v1
- Drag-and-drop upload
- Upload queue persistence across reconnects

## Decisions

### 1. Two-step IPC: dialog → then upload

Renderer calls `sftp:openUploadDialog` first (main opens native file picker, returns selected local paths). Renderer then shows a progress modal and calls `sftp:uploadFiles` with those paths.

**Why over a single combined call**: Separating dialog from upload lets the renderer render the progress modal before upload begins. A single blocking IPC call would freeze the UI until the entire upload finishes.

### 2. Main process handles recursive directory traversal

When a selected local path is a directory, the main process recursively reads it with Node's `fs` and flattens into `(localPath, remotePath)` pairs. The renderer only sends top-level paths.

**Why not renderer-side**: Renderer has no `fs` access. Exposing a recursive directory listing via IPC would require extra round-trips for each subdirectory.

### 3. Progress via push events (`webContents.send`)

Main sends `sftp:uploadProgress` events per file with `{ localPath, remoteName, status: 'uploading' | 'done' | 'error', error? }`. Renderer accumulates these in state to drive the progress modal.

**Why not polling**: Matches existing terminal output pattern. Push is lower latency and simpler.

### 4. Overwrite via existing `writeFile`

`ISftpService.writeFile` already overwrites — no special handling needed.

### 5. Upload target resolution

- Root toolbar button → uploads to `activeSession.initialDirectory || '/'`
- Context menu on directory → uploads into that directory
- Context menu on file → uploads into the file's parent directory

**Why file context menu targets parent**: Users right-clicking a file likely mean "upload beside this file", and uploading into a file path makes no sense.

### 6. `sftp:openUploadDialog` returns `null` on cancel

If the user dismisses the dialog without selecting files, main returns `null` and renderer does nothing (no progress modal shown).

## Risks / Trade-offs

- [Large files block the SFTP channel] → Upload each file sequentially (not parallel) to avoid saturating a single SSH multiplexed channel. Acceptable for v1.
- [Remote mkdir for nested dirs may fail if parent doesn't exist] → Use `mkdir -p` equivalent: create each path segment in order, ignoring "already exists" errors.
- [webContents may be destroyed mid-upload if user closes window] → Wrap `webContents.send` in a try/catch; if it throws, abort remaining uploads gracefully.
