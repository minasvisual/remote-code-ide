## 1. Domain & Port Contracts

- [x] 1.1 Update `ISftpService.downloadFile`/`downloadFolderAsZip` in `src/main/domain/ports/ISftpService.ts`
      to accept `{ transferId: string; signal?: AbortSignal; onProgress?: (transferred: number, total?: number) => void }`
- [x] 1.2 Document the `CANCELLED` error code convention (mirroring `DEST_EXISTS` on `copy`) in the port's
      TSDoc comment

## 2. Adapter: Ssh2SftpService

- [x] 2.1 Promote the private `statSafe` to be usable from `downloadFile` for total-size lookup before
      streaming starts
- [x] 2.2 Wire `AbortSignal` into `downloadFile`: on abort, destroy the read/write streams, run
      `cleanupPartialFile`, and reject with an `Error` carrying `code: 'CANCELLED'`
- [x] 2.3 Add byte-counting via `readStream.on('data', chunk => ...)` in `downloadFile` and invoke
      `onProgress(transferred, total)` on each chunk (throttling happens in the IPC layer, not here)
- [x] 2.4 Extend `collectFilesRecursive` usage in `downloadFolderAsZip` to also return each file's `size`
      (already present on `FileNode` from `listDir`) and sum them as `total` before archiving starts
- [x] 2.5 Wire `AbortSignal` into `downloadFolderAsZip`: on abort, destroy the archive/output streams, run
      `cleanupPartialFile` on the `.zip`, and reject with `code: 'CANCELLED'`
- [x] 2.6 Add byte-counting in `downloadFolderAsZip` from bytes read off each `sftp.createReadStream` (source,
      pre-compression) and invoke `onProgress(transferred, total)`

## 3. Main: Transfer Registry & IPC

- [x] 3.1 Add a small `DownloadTransferRegistry` (e.g. `src/main/adapters/temp/DownloadTransferRegistry.ts`)
      exposing `register(transferId, { localPath, abort })`, `unregister(transferId)`, `cancel(transferId)`,
      `cancelAll(): Promise<void>`, and `hasActive(): boolean`
- [x] 3.2 Instantiate the registry once in `src/main/index.ts` alongside `tempFiles`, pass it into
      `registerSftpIpc`
- [x] 3.3 Update the `sftp:downloadFile` handler in `sftp.ipc.ts` to generate a `transferId`, build an
      `AbortController`, register it, throttle-emit `sftp:downloadProgress` (≤ every ~200ms, plus one final
      unthrottled emit) via `_e.sender.send`, and unregister on settle (success, error, or cancel)
- [x] 3.4 Update the `sftp:downloadFolder` handler the same way, reusing the same throttling helper
- [x] 3.5 Add `sftp:cancelDownload` handler: looks up the `transferId` in the registry and calls its `abort`;
      no-ops silently if the id is unknown (already completed/cancelled)
- [x] 3.6 Return `{ transferId }` (in addition to the existing `{ success, error? }` shape) from
      `sftp:downloadFile`/`sftp:downloadFolder` so the renderer can correlate progress events and cancel calls

## 4. Main: Safe Window Close

- [x] 4.1 Add `win.on('close', ...)` in `createWindow()` (`src/main/index.ts`): if the registry has no active
      transfers, let the close proceed unmodified
- [x] 4.2 If transfers are active, call `event.preventDefault()` and show
      `dialog.showMessageBox(win, { type: 'warning', buttons: ['Cancel downloads and close', 'Keep downloading'], ... })`
- [x] 4.3 On "Cancel downloads and close": call `registry.cancelAll()`, `await` it (each cancelled transfer's
      underlying promise must resolve only after its partial file is unlinked), then `win.destroy()`
- [x] 4.4 On "Keep downloading" (or dialog dismissed): do nothing further — window stays open
- [x] 4.5 Verify `before-quit`/`tempFiles.cleanAll()` still run correctly after a `win.destroy()` triggered by
      this path (no double-cleanup errors)

## 5. Preload & Renderer API Surface

- [x] 5.1 Update `IRemoteApi` (`src/renderer/domain/ports/IRemoteApi.ts`): change `downloadFile`/
      `downloadFolder` return shape to include `transferId`, add `onDownloadProgress(cb): () => void` and
      `cancelDownload(transferId): Promise<void>`
- [x] 5.2 Implement the new preload methods in `src/preload/index.ts` (`ipcRenderer.invoke`/`.on`, following
      the existing `onUploadProgress` pattern for the subscribe/unsubscribe shape)
- [x] 5.3 Update `src/renderer/__tests__/helpers/mockApi.ts` with mock implementations of the new methods

## 6. Renderer: Notification Model

- [x] 6.1 Extend the `Notification` type in `AppContext.tsx` with optional `progress?: number` (0-100,
      undefined = indeterminate) and `onCancel?: () => void`
- [x] 6.2 Make `notify()` return the created notification's `id`
- [x] 6.3 Add `updateNotification(id, patch)` to `AppContext`, and skip the existing 4-second auto-dismiss
      timer for notifications whose latest patch has an in-progress status
- [x] 6.4 Update `NotificationList`/`Notification.tsx` (commons) to render a progress bar when `progress` is
      defined, an indeterminate spinner when it isn't, and a cancel affordance when `onCancel` is provided

## 7. Renderer: Download Flow (TreeNode)

- [x] 7.1 Update `handleDownloadClick` in `TreeNode.tsx`: after starting the download, create a notification
      with `progress: 0`, subscribe via `onDownloadProgress` filtered by the returned `transferId`, and call
      `updateNotification` on each event
- [x] 7.2 Wire the notification's `onCancel` to `api.sftp.cancelDownload(transferId)`
- [x] 7.3 On completion: patch the notification to a success state (existing `Downloaded ${node.name}`
      message) and let it auto-dismiss normally
- [x] 7.4 On error with `code !== 'CANCELLED'`: patch to the existing error notification behavior
- [x] 7.5 On error with `code === 'CANCELLED'`: patch to a neutral "Download cancelled" info notification
      instead of an error one
- [x] 7.6 Unsubscribe the progress listener once the notification reaches a terminal state

## 8. Tests

- [x] 8.1 Unit test `Ssh2SftpService.downloadFile`/`downloadFolderAsZip`: progress callback fires with
      increasing `transferred` values and a final value equal to `total`; abort mid-stream rejects with
      `code: 'CANCELLED'` and deletes the partial file
- [x] 8.2 Unit test the IPC throttling helper: rapid progress calls collapse to ≤ 1 emit per ~200ms window
      plus a guaranteed final emit
- [x] 8.3 Update `TreeNode.test.tsx`: download flow shows/updates a progress notification and handles the
      cancel button
- [x] 8.4 Unit test `AppContext`'s `updateNotification` and the auto-dismiss skip for in-progress
      notifications
- [x] 8.5 Manually verify on Windows: start a large-file download, close the window mid-download, confirm the
      "cancel and close" path deletes the partial file and the app exits without a lingering file lock
- [x] 8.6 Manually verify the "keep downloading" path leaves the window open and the download completes
      normally afterward
