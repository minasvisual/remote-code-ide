## Context

Currently, `EditorContext.closeTab` removes the tab synchronously without checking `isDirty`. Users can lose edits silently. On the main-process side, `app.on('before-quit')` only calls `tempFiles.cleanAll()` — it does not disconnect active SSH sessions, leaving orphan connections on remote servers.

The renderer only tracks a single `activeSession` in `AppContext`. The main process `Ssh2Client` holds a `Map<sessionId, Client>` with all live sessions. The existing `Modal` component in `commons/` can be reused for the confirmation dialog.

## Goals / Non-Goals

**Goals:**
- Prevent accidental data loss by confirming before closing dirty tabs
- Gracefully disconnect all SSH sessions when the Electron app quits
- Gracefully disconnect and prompt for unsaved files when the user manually disconnects
- Clean up temp files for each session during graceful shutdown

**Non-Goals:**
- Auto-save / draft recovery (future feature)
- Prompting on browser refresh or navigation (Electron app, not a web app)
- Multi-session support in the renderer (currently single `activeSession`)

## Decisions

### 1. Async close flow in EditorContext

`closeTab` becomes `closeTab(tabId: string): Promise<void>`. When the tab is dirty, it sets a pending-close state that renders an `UnsavedChangesDialog`. The dialog resolves a promise with the user's choice: save-and-close, discard, or cancel.

**Why async over imperative modal**: React state-driven dialogs are testable, avoid blocking the event loop, and align with the existing context pattern. A promise-based approach lets `EditorTabBar` simply `await closeTab(tabId)`.

**Alternative considered**: Using `window.confirm()` — rejected because it's synchronous, not styleable, and cannot offer a three-way choice (save/discard/cancel).

### 2. UnsavedChangesDialog as a commons component

A new `UnsavedChangesDialog` in `ui/components/commons/` built on the existing `Modal`. It receives the filename and three callbacks: onSave, onDiscard, onCancel. This keeps it reusable for future flows (e.g., close-all, switch-session).

### 3. Disconnect-all via ISshClient.disconnectAll()

Add `disconnectAll(): Promise<void>` to `ISshClient` and implement in `Ssh2Client` by iterating the sessions map. This avoids a new IPC channel — the main process calls it directly in the `before-quit` handler. No renderer involvement needed for app-quit cleanup.

**Why not a new IPC channel**: The `before-quit` event runs in the main process which already holds the `sshClient` instance. Adding IPC would require the renderer to be alive and responsive during shutdown, which is unreliable.

### 4. Manual disconnect flow

When the user clicks disconnect in the renderer, `AppContext.disconnect()` first checks `EditorContext` for dirty tabs belonging to the active session. If any exist, it prompts for each dirty tab (save/discard/cancel). If the user cancels any, the disconnect is aborted. After all tabs are resolved, the existing `ssh:disconnect` IPC call proceeds.

This requires `EditorContext` to expose a method like `getDirtyTabs(sessionId: string)` and the async `closeTab` to be callable from `AppContext` (via a ref or callback pattern).

### 5. App quit lifecycle

```
before-quit → sshClient.disconnectAll()
            → tempFiles.cleanAll()    (already exists)
```

The renderer is not involved — no unsaved-changes prompt on app quit. Rationale: Electron's `before-quit` can delay but not reliably coordinate async renderer dialogs across window close. For v1, quit discards unsaved changes (standard IDE behavior for force-quit). Auto-save or quit-interception can be added later.

## Risks / Trade-offs

- **[Risk] User loses unsaved work on app quit** → Acceptable for v1. Mitigation: the dirty indicator (●) is visible; future auto-save feature will address this fully.
- **[Risk] Disconnect-all fails for a session** → Mitigation: `disconnectAll` catches per-session errors and continues; `cleanAll` still runs regardless.
- **[Risk] Async closeTab changes the EditorContextValue interface** → Breaking for tests. Mitigation: update test mocks; the change is internal to the app.
