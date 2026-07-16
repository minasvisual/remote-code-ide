## 1. Domain & Port Contracts

- [x] 1.1 In `src/main/domain/ports/ISftpService.ts`, add types `SearchLineMatch { line: number; text: string }`
      and `SearchFileMatch { path: string; name: string; totalMatches: number; matches: SearchLineMatch[] }`
- [x] 1.2 Add `SearchOptions { signal?: AbortSignal; onMatch?: (result: SearchFileMatch) => void }` to the same
      file, mirroring the shape of the existing `DownloadOptions`
- [x] 1.3 Add `searchInFolder(sessionId: string, rootPath: string, query: string, options: SearchOptions): Promise<void>`
      to `ISftpService`, with a TSDoc note documenting: substring/case-insensitive matching only (no regex),
      files >2 MB and binary files (null byte in first 8 KB) are skipped silently, and per-item errors (listdir
      or read failures) are swallowed so the rest of the tree keeps being scanned

## 2. Adapter: Ssh2SftpService

- [x] 2.1 In `src/main/adapters/sftp/Ssh2SftpService.ts`, add private constants `MAX_SEARCH_FILE_SIZE = 2 * 1024 * 1024`
      and `MAX_REPORTED_MATCHES_PER_FILE = 10`
- [x] 2.2 Add a private `isBinaryBuffer(buffer: Buffer): boolean` helper that checks for a `0x00` byte in the
      first 8 KB of the buffer
- [x] 2.3 Implement `searchInFolder`: recursively walk the tree with `listDir` (same recursion shape as the
      existing `collectFilesRecursive`, but streaming per-file instead of collecting an array upfront), check
      `options.signal?.aborted` before processing each directory/file and throw a `CANCELLED`-coded error
      (mirroring `downloadFile`'s convention) as soon as it's detected
- [x] 2.4 For each file entry (skip symlinks, same convention as `collectFilesRecursive`/`copy`): `stat`-skip if
      size > `MAX_SEARCH_FILE_SIZE`; otherwise `readFile`, run `isBinaryBuffer`, skip if binary
- [x] 2.5 For non-binary, in-size-limit files: split content into lines, find case-insensitive substring matches
      of `query` per line; if any matches, build a `SearchFileMatch` (first `MAX_REPORTED_MATCHES_PER_FILE`
      matches with line number + line text truncated to ~200 chars, plus accurate `totalMatches`) and invoke
      `options.onMatch`
- [x] 2.6 Wrap the per-directory `listDir` call and the per-file `readFile` call each in their own try/catch:
      on failure, log and continue with the next sibling/directory instead of propagating the error up (per
      design Decision 5 / spec "Continuar a busca após erro em um item individual")
- [x] 2.7 Reject the returned promise with the `CANCELLED`-coded error only when the signal fires; resolve
      normally (without throwing) when the walk completes to the end

## 3. Main: Search Registry & IPC

- [x] 3.1 Add `src/main/adapters/temp/SearchTransferRegistry.ts` exposing `register(searchId, { abort })`,
      `unregister(searchId)`, `cancel(searchId): Promise<void>`, mirroring `DownloadTransferRegistry` minus the
      `localPath` field (no partial file to track for search)
- [x] 3.2 Instantiate the registry once in `src/main/index.ts` alongside `downloads`, pass it into
      `registerSftpIpc`
- [x] 3.3 In `src/main/infrastructure/ipc/sftp.ipc.ts`, add the `sftp:searchInFolder` handler: generate a
      `searchId` (uuid), build an `AbortController`, register it, call `sftp.searchInFolder(...)` with
      `onMatch` wired to `_e.sender.send('sftp:searchProgress', { searchId, type: 'match', result })`, and
      return `{ searchId }` immediately without awaiting the search to finish (same shape as
      `sftp:downloadFile`)
- [x] 3.4 On the search promise settling, emit a final `sftp:searchProgress` event with `type: 'done' | 'error' | 'cancelled'`
      (using the `CANCELLED` error code to pick `'cancelled'` vs `'error'`, mirroring the download handler) and
      `unregister` the search from the registry
- [x] 3.5 Add the `sftp:cancelSearch` handler: looks up `searchId` in the registry and calls `cancel`; no-ops
      silently if unknown (already completed/cancelled)

## 4. Preload & Renderer API Surface

- [x] 4.1 In `src/renderer/domain/ports/IRemoteApi.ts`, add `SearchLineMatch`, `SearchFileMatch`, and
      `SearchProgressEvent { searchId: string; type: 'match' | 'done' | 'error' | 'cancelled'; result?: SearchFileMatch; error?: string }`
      types, and add `searchInFolder(sessionId, rootPath, query): Promise<{ searchId: string }>`,
      `onSearchProgress(callback: (event: SearchProgressEvent) => void): () => void`, and
      `cancelSearch(searchId: string): Promise<void>` to the `sftp` section
- [x] 4.2 Implement the three new methods in `src/preload/index.ts` (`ipcRenderer.invoke`/`.on`), following the
      existing `onDownloadProgress`/`cancelDownload` subscribe/unsubscribe pattern
- [x] 4.3 Update `src/renderer/__tests__/helpers/mockApi.ts` with mock implementations of `searchInFolder`,
      `onSearchProgress`, and `cancelSearch`

## 5. Renderer: FindInFolderModal Component

- [x] 5.1 Create `src/renderer/ui/components/explorer/FindInFolderModal.tsx` with props
      `{ sessionId: string; rootPath: string; onClose: () => void }`; build its own modal shell (not the shared
      `Modal` component) following the `UploadDialog.tsx` precedent, since it needs a search input in the header
      area and a scrollable results list, sized wider (e.g. `max-w-2xl`) to fit file paths and line snippets
- [x] 5.2 Add local state: `query`, `results: SearchFileMatch[]`, `isSearching`, and a ref holding the current
      `searchId` (so late/out-of-date `sftp:searchProgress` events for a superseded search can be ignored)
- [x] 5.3 Wire form submit (Enter key or "Search" button) to: no-op if `query.trim()` is empty; otherwise cancel
      any in-flight search for the previous `searchId` (if any), clear `results`, call
      `api.sftp.searchInFolder(sessionId, rootPath, query.trim())`, store the returned `searchId`, and set
      `isSearching = true`
- [x] 5.4 Subscribe to `api.sftp.onSearchProgress` once on mount; in the callback, ignore events whose
      `searchId` doesn't match the ref's current value; on `match` append `event.result` to `results`; on
      `done`/`cancelled` set `isSearching = false`; on `error` set `isSearching = false` and call
      `notify('error', ...)` from `useApp()`
- [x] 5.5 Render a loading indicator (reuse `Spinner`) next to the input while `isSearching`, a "Cancel" action
      that calls `api.sftp.cancelSearch(currentSearchId)` while searching, and an empty state ("No matches
      found") when a search has completed with zero results
- [x] 5.6 Render each `SearchFileMatch` as a clickable row: file name + full path, `totalMatches` count, and up
      to `matches.length` line snippets (each prefixed with its line number); split each snippet around the
      matched substring and render the three pieces as separate JSX text nodes (no `dangerouslySetInnerHTML`)
      so the matched portion can be visually emphasized safely
- [x] 5.7 On row click: call `openFile` from `useEditor()` with a `FileNode`-shaped object built from the
      result's `path`/`name` (`type: 'file'`), matching the same call `TreeNode.handleClick` already makes, then
      call `onClose()`
- [x] 5.8 On unmount or explicit close while `isSearching`: call `api.sftp.cancelSearch(currentSearchId)`
      before/alongside invoking `onClose()`, and unsubscribe the `onSearchProgress` listener

## 6. Renderer: Wire Menu Items

- [x] 6.1 In `TreeNode.tsx`, add local state `findTarget: FileNode | null`; add a `{ label: 'Find in Folder...', onClick: () => setFindTarget(node) }`
      entry to `contextMenuItems`, inside the existing `node.type === 'directory'` conditional block
- [x] 6.2 Render `{findTarget && <FindInFolderModal sessionId={sessionId} rootPath={findTarget.path} onClose={() => setFindTarget(null)} />}`
      alongside the other conditionally-rendered modals in `TreeNode`
- [x] 6.3 In `FileExplorer.tsx`, change the background `ContextMenu` render condition from
      `{contextMenu && clipboard && (...)}` to `{contextMenu && (...)}`, building the `items` array
      conditionally: always include `{ label: 'Find in Folder...', onClick: () => setFindTarget(rootDir) }`,
      and include the existing `{ label: 'Paste', ... }` entry only when `clipboard` is set (same visibility
      rule already used elsewhere, per `explorer-copy-paste` spec)
- [x] 6.4 Add local state `findTarget: string | null` to `FileExplorer` and render
      `{findTarget && <FindInFolderModal sessionId={activeSession.sessionId} rootPath={findTarget} onClose={() => setFindTarget(null)} />}`

## 7. Tests

- [x] 7.1 Unit test `Ssh2SftpService.searchInFolder`: emits `onMatch` for files containing the term
      (case-insensitive), skips files above the size limit, skips binary files (null-byte heuristic), continues
      past a `listDir`/`readFile` failure on one item, and rejects with `code: 'CANCELLED'` when the signal
      aborts mid-walk
- [x] 7.2 Unit test the `sftp:searchInFolder`/`sftp:cancelSearch` IPC handlers: returns `{ searchId }`
      immediately without awaiting completion, emits `sftp:searchProgress` events with the right `type`
      sequence, and `cancelSearch` on an unknown id is a silent no-op
- [x] 7.3 Component test for `FindInFolderModal`: empty query does not trigger a search; results render
      incrementally as `onSearchProgress` events fire; clicking a result calls `openFile` and `onClose`;
      starting a new search while one is in flight cancels the previous `searchId` and clears prior results
- [x] 7.4 Update `TreeNode.test.tsx`: "Find in Folder..." appears in a directory's context menu and is absent
      from a file's context menu; clicking it opens `FindInFolderModal` with the directory's path
- [x] 7.5 Update `FileExplorer.test.tsx`: right-clicking empty space shows "Find in Folder..." regardless of
      clipboard state, and shows "Paste" only when `clipboard` is set
