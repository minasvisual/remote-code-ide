## 1. UnsavedChangesDialog Component

- [x] 1.1 Create `UnsavedChangesDialog` component in `src/renderer/ui/components/commons/UnsavedChangesDialog.tsx` using the existing `Modal` — props: `filename`, `onSave`, `onDiscard`, `onCancel`
- [x] 1.2 Write unit test for `UnsavedChangesDialog` verifying it renders filename and all three buttons trigger their callbacks

## 2. Async Close Tab Flow in EditorContext

- [x] 2.1 Add `pendingClose` state to `EditorContext` (`{ tabId, resolve }` or `null`) to track which tab is awaiting confirmation
- [x] 2.2 Change `closeTab` to async: if tab is dirty, set `pendingClose` and return a promise; if clean, close immediately
- [x] 2.3 Add `confirmClose(action: 'save' | 'discard' | 'cancel')` to `EditorContext` that resolves the pending close — save calls `sftp:writeFile` then closes, discard closes directly, cancel clears `pendingClose`
- [x] 2.4 Expose `pendingClose` and `confirmClose` in the `EditorContextValue` interface
- [x] 2.5 Render `UnsavedChangesDialog` inside `EditorProvider` when `pendingClose` is set, wiring the three callbacks to `confirmClose`
- [x] 2.6 Update existing `EditorContext` unit tests and add new tests for the dirty-tab close flow (save, discard, cancel paths)

## 3. EditorTabBar Integration

- [x] 3.1 Update `EditorTabBar` close button to call the async `closeTab` (no dialog logic in the component — it's handled by the context)

## 4. ISshClient.disconnectAll — Port & Adapter

- [x] 4.1 Add `disconnectAll(): Promise<void>` to `ISshClient` interface in `src/main/domain/ports/ISshClient.ts`
- [x] 4.2 Implement `disconnectAll()` in `Ssh2Client` — iterate sessions map, call `client.end()` for each, catch per-session errors, clear the map

## 5. Graceful Disconnect on App Quit

- [x] 5.1 Update `src/main/index.ts` `before-quit` handler to call `sshClient.disconnectAll()` before `tempFiles.cleanAll()`

## 6. Manual Disconnect with Unsaved Changes Prompt

- [x] 6.1 Add `getDirtyTabsBySession(sessionId: string): EditorTab[]` helper to `EditorContext`
- [x] 6.2 Update `AppContext.disconnect()` to check for dirty tabs via a callback/ref from `EditorContext` — if dirty tabs exist, iterate and call `closeTab` for each; abort disconnect if any returns `cancel`
- [x] 6.3 Add unit tests for the manual disconnect flow: no dirty tabs proceeds, dirty tabs prompt, cancel aborts disconnect

## 7. Typecheck & Existing Tests

- [x] 7.1 Run `npm run typecheck` and fix any type errors from the interface changes
- [x] 7.2 Run `npm run test:unit` and fix any broken tests from the `closeTab` signature change
