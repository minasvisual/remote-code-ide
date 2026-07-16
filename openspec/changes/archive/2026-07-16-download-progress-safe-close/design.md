## Context

`downloadFile`/`downloadFolderAsZip` (`src/main/adapters/sftp/Ssh2SftpService.ts:264-339`) already stream
straight to disk (`readStream.pipe(writeStream)` / `archiver` → `createWriteStream`) instead of buffering in
memory like `readFile` does. They already clean up the partial local file on error via
`cleanupPartialFile` (`fsp.unlink`, line 358-364). What's missing is: (a) any progress signal emitted during
the stream, (b) a way to abort a stream already in flight, and (c) anything on the `BrowserWindow` that reacts
to a close attempt — today `src/main/index.ts` has no `close` handler at all, only `before-quit`
(disconnect + `tempFiles.cleanAll()`) and `window-all-closed`. `TempFileManager.cleanAll()` uses sync
`rmSync` wrapped in a swallowed try/catch, so a file still open for writing (Windows EBUSY) fails silently and
is never retried.

The existing upload flow (`sftp.ipc.ts:182-216`, `FileExplorer.tsx:114-140`) is the closest precedent for
progress: a per-sender `webContents.send('sftp:uploadProgress', payload)` stream consumed by patching local
React state per event. That pattern is reused here for downloads, adapted for byte-level (not just
per-file) progress and for a single target (one file or one zip) rather than a list of many files.

## Goals / Non-Goals

**Goals:**
- Emit byte-level progress for `downloadFile` and `downloadFolderAsZip`, throttled to avoid flooding IPC.
- Let the user cancel an in-flight download; cancellation deletes the partial local file.
- Intercept the main window's close attempt while any download is active; offer to cancel the download(s)
  and delete partial files before closing, or keep the window open and let the download continue.
- Support this for however many downloads happen to be in flight at once (the transfer registry is keyed by
  id), even though the UI in this change only needs to render them as independent toasts.

**Non-Goals:**
- Pause/resume of downloads.
- Progress reporting for `sftp:readFile` (editor-open path) — capped at 5 MB (`MAX_FILE_SIZE`,
  `sftp.ipc.ts:9`), fast enough that a progress UI adds little value; out of scope for this change.
- A dedicated "Transfers" panel/tab. Concurrent downloads are shown as separate stacked notifications,
  reusing the existing notification list.
- Resuming or retrying a cancelled/failed download automatically.

## Decisions

**1. Transfer registry lives in the main process, keyed by `transferId`.**
A small in-memory registry (`Map<string, { localPath: string; abort: () => void }>`) tracks active downloads.
It's authoritative for "is anything downloading right now," which the window `close` handler needs
synchronously. Alternative considered: track active downloads in renderer state and gate close via a
`beforeunload`-style renderer hook — rejected because the `close` event fires on the `BrowserWindow` in the
main process, and round-tripping to the renderer to ask "are you downloading" adds a race (renderer could be
reloading, unresponsive, or the download could have been kicked off from a since-closed panel). A main-process
registry is simple and doesn't depend on renderer liveness.

**2. Cancellation via `AbortController`/`AbortSignal`, not a custom cancel-token type.**
`ISftpService.downloadFile`/`downloadFolderAsZip` gain a `signal?: AbortSignal` parameter. `sftp.createReadStream()`
returns a standard Node `Readable`, so `signal.addEventListener('abort', () => readStream.destroy(...))` is
enough to unblock the pipe and trigger the existing error path (which already calls `cleanupPartialFile`).
No new dependency required — `AbortController` is a Node/DOM global.

**3. Progress callback threaded through the port methods, throttled by time not percentage.**
`downloadFile`/`downloadFolderAsZip` gain an `onProgress?: (transferred: number, total: number) => void`
parameter. The IPC handler wraps this in a closure that calls `sender.send('sftp:downloadProgress', payload)`
at most once every ~200ms (tracked via `Date.now()` comparison), plus always once more at completion so the
UI reaches exactly 100%. Time-based throttling was chosen over "emit every N% change" because file sizes vary
by orders of magnitude and a time-based cap gives a predictable UI update rate regardless of size.

**3a. `sftp:downloadFile`/`downloadFolder` return `{ transferId }` immediately; completion is reported via
`sftp:downloadProgress`, not via the invoke's resolved value.** (Deviation found during implementation — the
plan above reads as if the IPC handler `await`s the whole transfer before responding, same as the old
`{ success, error? }` shape.) That can't work: the renderer needs the `transferId` *while the download is
still running* so the notification's Cancel button can call `sftp:cancelDownload(transferId)` mid-transfer —
if the ID only arrives once the invoke promise resolves, cancellation is impossible. Instead the handler
generates the `transferId`, registers the transfer, and returns `{ transferId }` right away without awaiting
`sftp.downloadFile(...)`. The transfer runs in the background; when it settles, the handler emits one final
`sftp:downloadProgress` event carrying a terminal `status: 'done' | 'error' | 'cancelled'` (plus `error` on
failure) — mirroring the `pending/uploading/done/error` convention `sftp:uploadProgress` already uses, rather
than inventing a second event channel. The renderer's `onDownloadProgress` handler treats any event with a
terminal status as the transfer's outcome and unsubscribes.

**4. Total bytes: `stat` for single files, sum of already-known `FileNode.size` for folder zips.**
`downloadFile` calls the existing private `statSafe` (promoted to accessible) to get the remote file size
before opening the stream. `downloadFolderAsZip` already lists every file recursively via
`collectFilesRecursive` (`Ssh2SftpService.ts:341-356`), which is built from `listDir` results that already
carry `size` (`FileNode.size`) — summing them costs no extra round trip. If `stat` fails, total is `undefined`
and the UI falls back to an indeterminate spinner instead of blocking the download on a missing size.

**5. Cancellation is a distinct error shape from a real failure.**
When a signal aborts the stream, the resulting error is normalized to carry `code: 'CANCELLED'` (mirroring the
existing `DEST_EXISTS` convention in `copy`). The renderer uses this to show a neutral "Download cancelled"
notification instead of a red error toast, while still reusing the exact same `cleanupPartialFile` path as a
genuine failure — cancellation and error-cleanup are the same code path with a different message.

**6. Window close: `preventDefault()` + confirm dialog + `win.destroy()` after cleanup settles.**
`src/main/index.ts` adds a `win.on('close', ...)` handler. If the transfer registry is non-empty, it calls
`event.preventDefault()` and `dialog.showMessageBox(win, { type: 'warning', buttons: [...] })`. If the user
picks "cancel and close," the handler aborts every registered transfer, `await`s their promises (which only
resolve once `writeStream` is closed and the partial file unlinked), then calls `win.destroy()` — which does
not re-trigger `close`. If the user picks "keep downloading," nothing happens and the window stays open.
Awaiting cleanup before `destroy()` is what actually fixes the Windows file-lock symptom the proposal is about
— closing the window without waiting for the write stream's `close` event is what leaves the file locked today.

**7. UI: extend the existing `Notification` model instead of building a new component.**
`Notification` (`AppContext.tsx`) gains an optional `progress?: number` (0-100, omitted = indeterminate) and
`onCancel?: () => void`. `notify()` returns the created notification's id; a new `updateNotification(id, patch)`
is added to `AppContext` so `TreeNode`'s download handler can patch one toast in place as
`sftp:downloadProgress` events arrive — the same "patch local state per event" shape `FileExplorer` already
uses for `uploadEntries`. A notification with `progress !== undefined` and status `'downloading'` skips the
existing 4-second auto-dismiss timer until a terminal `done`/`error`/`cancelled` event patches it.
This keeps single-target downloads visually lightweight (one toast with a bar) instead of reusing the
multi-file upload dialog, which is designed for lists of many files.

**8. User-facing strings stay in English; spec/proposal docs stay in Portuguese.**
Existing `notify()` calls in `TreeNode.tsx` are English (e.g. `Failed to download ${node.name}`) even though
`openspec/specs/**/*.md` is written in Portuguese. New strings (progress text, cancel button, close-confirm
dialog) follow the existing UI convention (English), consistent with the rest of the app.

## Risks / Trade-offs

- [Risk] Throttled progress can look stale right as a fast LAN transfer finishes → Mitigation: always emit one
  final unthrottled progress update immediately before the operation resolves.
- [Risk] `win.destroy()` skips the graceful renderer teardown `close` normally allows → Mitigation: this only
  fires on the explicit "cancel downloads and close" confirmation path, after downloads are already aborted
  and cleaned up; the "keep downloading" path never reaches `destroy()`.
- [Risk] **BREAKING** signature change to `ISftpService.downloadFile`/`downloadFolderAsZip` and the
  corresponding `IRemoteApi` methods ripples outward → Mitigation: there is exactly one caller today
  (`TreeNode.tsx`'s `handleDownloadClick`), updated in the same change; no other code paths call these methods.
- [Risk] Folder-zip progress is based on bytes read from the SFTP source (pre-compression), so the progress
  bar may not land on exactly 100% the instant `archive.finalize()` settles (archiver flushes extra bytes) →
  Mitigation: same as the LAN-speed risk — the terminal progress event and the `done` status both force the
  UI to 100%/complete regardless of the last byte-ratio observed.
- [Risk] Multiple concurrent downloads stack as multiple toasts with no aggregate view → Mitigation: accepted
  for this change (explicit non-goal); current usage pattern is one download at a time from the context menu.

## Migration Plan

No persisted data or on-disk temp-file layout changes — this only changes in-memory method signatures and IPC
payloads. Ship as a normal PR; rollback is a plain revert since nothing is migrated.

## Open Questions

- None blocking. Whether to eventually surface a dedicated multi-transfer panel (if concurrent downloads
  become common) is deferred until usage shows it's needed, per the stated non-goal.
