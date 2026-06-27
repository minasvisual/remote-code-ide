## Why

Users can lose unsaved work when closing editor tabs — the current `closeTab` discards content immediately without warning. Additionally, when the app is closed or the user disconnects manually, active SSH/SFTP connections are not cleanly terminated, leaving orphan sessions on remote servers and skipping temp-file cleanup for those sessions.

## What Changes

- Show a confirmation dialog when closing an editor tab that has `isDirty: true`, offering three options: **Save & Close**, **Discard**, and **Cancel**
- On application quit (`before-quit` / `window-all-closed`), disconnect all active SSH sessions gracefully before exiting
- On manual disconnect, ensure all dirty tabs belonging to that session prompt for save before the connection is torn down
- Clean up temp files for each disconnected session as part of the graceful shutdown

## Capabilities

### New Capabilities
- `unsaved-changes-dialog`: Confirmation dialog when closing a dirty editor tab — save, discard, or cancel actions
- `graceful-disconnect`: Disconnect all active SSH sessions on app close and clean up resources; prompt for unsaved changes on manual disconnect

### Modified Capabilities

## Impact

- **Renderer**: `EditorContext.closeTab` gains async confirm-before-close logic; new `UnsavedChangesDialog` component in `ui/components/commons/`; `EditorTabBar` calls the new async close flow
- **Main process**: `src/main/index.ts` adds a `before-quit` handler that iterates active sessions and calls `sshClient.disconnect()` for each; `Ssh2Client` needs a method to list/disconnect all sessions
- **IPC**: No new channels required — existing `ssh:disconnect` is sufficient; may need a new `ssh:disconnectAll` channel for batch cleanup
- **Dependencies**: None — uses only existing Electron lifecycle events and React state
