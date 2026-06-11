## Context

The file explorer (`TreeNode.tsx`) currently supports only left-click: expand/collapse for directories and open for files. There is no way to delete or rename remote files/folders from the UI — users must use the integrated terminal. The SFTP IPC layer already exposes `sftp:rename` and `sftp:delete` (file unlink only). `IRemoteApi` already declares `api.sftp.rename` and `api.sftp.delete`. A new `sftp:deleteRecursive` channel and a corresponding `ISftpService.deleteRecursive` method must be added to support non-empty folder removal.

## Goals / Non-Goals

**Goals:**
- Right-click on any tree node (file or folder) opens a context menu with Rename and Delete actions
- Deleting a **file**: confirmation dialog → `api.sftp.delete(sessionId, path)` (existing channel)
- Deleting a **folder**: confirmation dialog with explicit recursive-delete warning → `api.sftp.deleteRecursive(sessionId, path)` (new channel)
- Rename prompts inline (input field replaces the node label) for the new name, then calls `api.sftp.rename`
- The tree refreshes / removes the node after a successful operation without a full reload
- UI follows existing `ide-*` Tailwind token conventions

**Non-Goals:**
- Copy, move, paste, or multi-select operations
- Keyboard shortcut (F2 / Delete key) bindings — left for a future change
- Right-click on the root explorer header or the activity bar
- Progress indicator during recursive delete (error is surfaced; no per-file progress)

## Decisions

### 1. Context menu rendered as a floating div, not a native menu

**Decision:** Render a small absolutely-positioned `div` on `contextmenu` event; dismiss on click-outside or `Escape`.

**Rationale:** The app is a web renderer; `electron.remote.Menu` would require enabling privileged APIs or sending an IPC round-trip. A CSS-positioned div is simpler, consistent with the existing web UI, and dismissible without extra plumbing. The menu is tiny (2 items) so accessibility complexity is low.

**Alternative considered:** Electron's native context menu via `ipcMain` + `Menu.buildFromTemplate`. Rejected because it requires a new IPC channel and breaks the renderer's self-contained UI pattern.

### 2. Inline rename (edit-in-place) instead of a modal

**Decision:** When the user clicks Rename, the node label is replaced with a controlled `<input>` pre-filled with the current name. Pressing `Enter` or blurring commits; `Escape` cancels.

**Rationale:** Edit-in-place is the standard UX for file tree renames (VS Code, Finder, Explorer). It keeps the operation contextual and avoids a second modal on top of the confirm dialog. The `Input.tsx` component from commons can be reused.

**Alternative considered:** A modal with an input field (same pattern as delete confirmation). Rejected as heavier UX for a rename where the old name is already visible.

### 3. Recursive folder delete implemented in main process (not renderer)

**Decision:** Add `ISftpService.deleteRecursive(sessionId, path)` implemented in `Ssh2SftpService`: call `listDir` recursively, `sftp.unlink` each file, and `sftp.rmdir` each directory depth-first. Expose as `sftp:deleteRecursive` IPC channel. Renderer calls `api.sftp.deleteRecursive` only for directory nodes.

**Rationale:** The recursion requires multiple SFTP operations in sequence. Keeping this in the main process avoids many IPC round-trips (one per file) and keeps business logic out of the renderer. The existing `sftp:delete` channel (unlink) is kept for file nodes.

**Alternative considered:** Renderer-side recursion calling `sftp:listDir` + `sftp:delete` in a loop. Rejected: O(n) IPC calls, complexity in renderer, violates the "no logic in IPC handlers" rule.

### 4. State propagation via callback props (no context change)

**Decision:** `TreeNode` receives optional `onDelete` and `onRename` callbacks from its parent (`FileExplorer`). After a successful operation the callback removes/renames the node in the parent's children state.

**Rationale:** `TreeNode` already manages its own children list in local state. Lifting the delete/rename notification one level (to the immediate parent) is the minimal change — no new context or global state needed. `AppContext` is not touched.

**Alternative considered:** Store a `refreshTrigger` counter in `AppContext` and re-fetch the whole tree on increment. Rejected as unnecessary — we already have the data locally.

## Risks / Trade-offs (updated)

- **Recursive delete is irreversible** → Mitigation: the confirmation dialog for folder deletion MUST explicitly state `"This will permanently delete the folder \"${name}\" and ALL its contents. This cannot be undone."` so the user is unambiguously warned before any SFTP call.
- **Recursive delete partial failure** (e.g. permission error mid-traversal) → Mitigation: surface error via `notify('error', ...)`, node stays in tree. The user can retry or use the terminal. No rollback is attempted.
- **Context menu z-index conflicts** → Mitigation: use `z-[9999]` Tailwind class on the menu div.
- **Rename race condition** → Low risk; input is disabled while IPC call is in flight.
- **Deeply nested callback propagation** → Acceptable; tree is lazy-loaded and typically shallow.

