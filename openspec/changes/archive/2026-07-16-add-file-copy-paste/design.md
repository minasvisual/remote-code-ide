## Context

The explorer (`FileExplorer.tsx` + `TreeNode.tsx`) already drives every remote file operation through
`ISftpService` (implemented by `Ssh2SftpService`, on top of a single cached `SFTPWrapper` per session) and
exposes them to the renderer via `IRemoteApi.sftp` / `window.api`. The SFTP protocol itself has no native
"copy" verb, so every existing write path (`writeFile`, `uploadFiles`, `deleteRecursive`,
`downloadFolderAsZip`) is already built by composing `readdir`/`stat`/read-stream/write-stream calls
recursively in `Ssh2SftpService`. Copy needs the same treatment.

The app has exactly one `activeSession` at a time (`AppContext`), so a copy/paste clipboard only ever needs
to reason about one SSH session — there is no cross-connection paste to design for today.

`TreeNode.tsx` already has a confirm-before-destructive-action pattern (the delete confirmation `Modal`, with
Cancel/Danger `Button`s) and a "retry after a name-collision error" pattern (`NewFileDialog`'s `FILE_EXISTS`
handling via `createFile`'s `{ code: 'FILE_EXISTS' }` error). Both are reused below instead of inventing new
patterns for overwrite confirmation.

## Goals / Non-Goals

**Goals:**
- Let a user copy a file or folder and paste it into any directory in the same session, entirely
  server-side (no temp file round-trip through the local machine).
- For folders, copy and paste recursively — the full subtree (files and nested subdirectories) is
  duplicated at the destination.
- Make the clipboard reusable for multiple pastes until the user copies something else.
- If an item with the same name already exists at the destination, ask the user via a confirmation dialog
  before overwriting it — never overwrite silently, and never fail outright without giving the user a choice.
- Never allow a folder to be pasted into itself or a descendant of itself.
- Support pasting at the root of the tree with no folder node selected (right-click on empty space in the
  explorer, below/around the root items).

**Non-Goals:**
- Cut (move) operation — only Copy/Paste.
- Cross-session or cross-server paste.
- Paste on a file's context menu (Paste only ever targets a directory — either a specific folder node, or the
  tree root via the background context menu).
- Merging directory contents on overwrite — overwriting a folder replaces it wholesale (see Decision 2).
- Keyboard shortcuts (Ctrl+C/Ctrl+V) — mouse context menu only, matching how every other explorer action
  (rename, delete, download) is currently exposed.

## Decisions

**1. Copy is implemented as a new recursive `ISftpService.copy()` method, not a shell `cp -r` exec.**
`Ssh2Client`/`ISshClient` only exposes the SFTP subsystem today (see `getSftp` in `Ssh2SftpService`) — there
is no generic "exec a command" port, and adding one just for this would cross a much wider security surface
(arbitrary remote command execution) for a single feature. Instead, `copy()` mirrors the pattern already used
by `deleteRecursive`/`collectFilesRecursive`: `listDir` to enumerate, `mkdir` for directories, and paired
`createReadStream`/`createWriteStream` for files, recursing into subdirectories so a folder paste duplicates
its entire subtree. This keeps the port surface consistent (SFTP-only) and reuses proven streaming code.

**2. Collision handling: explicit confirm-before-overwrite dialog, not auto-rename.**
`copy()` takes an `overwrite: boolean` argument (default `false`). It `stat`s the destination path first:
- If nothing exists there, it copies straight away.
- If something exists and `overwrite` is `false`, it throws an error with `code: 'DEST_EXISTS'` — the same
  shape as the existing `FILE_EXISTS` error thrown by `createFile`/`mkdir` — and performs no I/O.
- If something exists and `overwrite` is `true`, it removes the existing destination first (`delete` for a
  file, `deleteRecursive` for a directory) and then performs the copy.

On the renderer side, `Paste` first calls `api.sftp.copy(..., { overwrite: false })`. If it rejects with
`DEST_EXISTS`, a confirmation `Modal` opens (reusing the same Cancel/Danger `Button` composition as the
existing delete-confirmation dialog in `TreeNode.tsx`): *"An item named "X" already exists here. Overwrite
it?"*. Confirming re-invokes `api.sftp.copy(..., { overwrite: true })`; cancelling clears the pending paste
and leaves the destination untouched.

Alternatives considered:
- *Auto-rename* (`name (copy)`, `name (copy 2)`, …) — this was the original plan, but it lets a paste
  silently create an unbounded number of near-duplicate files with no way to intentionally overwrite. Rejected
  in favor of an explicit choice.
- *Silent overwrite* — rejected outright: destructive by accident, no confirmation.
- *Merge directories on overwrite* (keep non-conflicting children, resolve conflicts file-by-file) — rejected
  for v1: this turns one confirmation into a per-file conflict-resolution flow, which is a much larger
  feature than what was asked for. Directory overwrite is whole-folder replace, matching how deleting and
  re-pasting a folder would behave anyway.

**3. Self-paste guard is a path-prefix check, not a live cycle check.**
Before starting a directory copy, `copy()` rejects when `destPath === sourcePath` or `destPath` starts with
`sourcePath + '/'`. This is a cheap, deterministic guard computed from the two paths before any I/O happens,
and it exactly captures the only way this recursive algorithm could corrupt data or recurse into a
destination it is still writing (pasting a folder inside itself or a subfolder of itself). This check runs
before the collision/overwrite check in Decision 2, so a self-paste is always rejected outright rather than
ever prompting the overwrite dialog.

**4. Clipboard state lives in `AppContext`, not local `TreeNode` state.**
`TreeNode` instances are per-row and unmount/remount as the tree collapses/expands; `AppContext` is already
the home for session-scoped cross-cutting state (`activeSession`, `notifications`, `terminalTargetDir`). The
clipboard (`{ sessionId, path, name, type } | null`) needs to be visible to every directory's context menu
*and* to the new root/background context menu (Decision 6) simultaneously, so it follows the same pattern:
`clipboard` state + `copyToClipboard()` / `clearClipboard()` actions on `AppContextValue`. It is cleared on
disconnect (session becomes invalid) the same way `terminalTargetDir` already resets in `disconnect()`.

**5. Paste triggers the existing `refreshTarget` mechanism (or a full reload at the root), not a full explorer
reload for nested folders.**
`TreeNode`/`FileExplorer` already have a `refreshTarget: { path, tick }` prop threaded down for targeted
refresh after upload (`handleUploadDialogClose`), and `FileExplorer.tsx` already special-cases `targetDir ===
'/'` to call `load()` directly instead of setting `refreshTarget`. Paste reuses both halves of that existing
convention unchanged: pasting into a specific folder node sets `refreshTarget`; pasting at the root (Decision
6) calls `load()`.

**6. Root paste is a new background context menu on `FileExplorer`, gated on an empty-space right-click.**
`FileExplorer.tsx` currently has no context menu of its own — only header buttons. Add local `contextMenu`
state plus an `onContextMenu` handler on the scrollable root container (the `flex-1 overflow-y-auto` div),
rendering the existing `ContextMenu` component with a single "Paste" item (shown only when `clipboard` is
non-null), targeting `rootDir = activeSession.initialDirectory || '/'`. Every `TreeNode` row's own
`handleContextMenu` already calls `e.stopPropagation()`, so a right-click on any actual file/folder row never
bubbles up to this new root handler — it only fires for genuine clicks on empty space, requiring no extra
"is a node selected" tracking to distinguish the two cases.

## Risks / Trade-offs

- **[Risk] The confirm-overwrite flow is two round-trips (attempt → `DEST_EXISTS` → confirm → retry with
  `overwrite: true`) instead of one** → *Mitigation*: this mirrors the existing `FILE_EXISTS` retry pattern
  already used by `NewFileDialog` for New File/New Folder in this codebase, so it's a consistent, familiar
  shape rather than a new one; the extra round trip is invisible to the user beyond the confirmation click
  they're already making.
- **[Risk] Directory overwrite is delete-then-copy, not atomic** — if the copy fails partway after the old
  directory has already been removed, the destination is left partially written or empty → *Mitigation*:
  accepted for v1, consistent with `deleteRecursive` already being a non-transactional, best-effort operation
  elsewhere in this codebase; flagged below as an open question rather than solved now.
- **[Risk] Copying a very large folder blocks with no progress indicator** (unlike uploads, which stream
  progress events over `sftp:uploadProgress`) → *Mitigation*: out of scope to add a progress UI for v1; the
  existing `notify()` pattern shows a spinner-less success/error toast, consistent with how `rename`/`mkdir`/
  `delete` behave today (also fire-and-wait, no progress). Revisit if large-folder copies turn out to be a
  common pattern.
- **[Risk] Two sequential SFTP streams per file (one source-session read, one dest-session write) share the
  same cached `SFTPWrapper`** → *Mitigation*: `Ssh2SftpService` already runs concurrent reads/writes over one
  `SFTPWrapper` elsewhere (e.g. `downloadFolderAsZip` opens many concurrent `createReadStream` calls against
  one session), so this is a proven-safe usage pattern in this codebase, not a new risk class.
- **[Trade-off] No Cut/Move** — a move could be implemented as `rename()` when staying within the same
  session (already supported) or copy+delete across directories, but the user only asked for copy/paste, and
  adding Cut now would expand scope without a corresponding request.

## Open Questions

- Should directory overwrite be made safer (e.g. copy to a temporary sibling name, then swap/delete-old on
  success) instead of delete-then-copy? Deferred — replace-only, non-atomic is accepted for v1 per the risk
  above; revisit if data loss from a failed overwrite turns out to matter in practice.
- Root paste and folder paste share the exact same `DEST_EXISTS`/overwrite confirmation flow (Decision 2) —
  no special-casing was identified for the root case, but this should be re-checked once implemented.
