## ADDED Requirements

### Requirement: Disconnect all sessions on app quit
The system SHALL disconnect all active SSH sessions when the Electron application is closing (`before-quit` event). Each session MUST be terminated gracefully via `client.end()`.

#### Scenario: App quit with active sessions
- **WHEN** the user closes the application while one or more SSH sessions are active
- **THEN** system calls `disconnectAll()` on the SSH client, terminating all active sessions before the process exits

#### Scenario: App quit with no active sessions
- **WHEN** the user closes the application with no active SSH sessions
- **THEN** system proceeds with normal quit without errors

#### Scenario: A session fails to disconnect during quit
- **WHEN** one session throws an error during `disconnectAll()`
- **THEN** system continues disconnecting remaining sessions and still cleans up temp files

### Requirement: Clean up temp files for all sessions on quit
The system SHALL clean up all temporary files after disconnecting sessions during app quit.

#### Scenario: Temp files cleaned after disconnect-all
- **WHEN** `disconnectAll()` completes (successfully or with errors)
- **THEN** system calls `tempFiles.cleanAll()` to remove all temporary files

### Requirement: Prompt for unsaved changes on manual disconnect
The system SHALL check for dirty editor tabs belonging to the active session when the user triggers a manual disconnect. If dirty tabs exist, the system MUST prompt the user for each one before proceeding with disconnect.

#### Scenario: Manual disconnect with dirty tabs
- **WHEN** the user clicks disconnect and there are editor tabs with `isDirty: true` for the active session
- **THEN** system prompts the user for each dirty tab (save/discard/cancel) before disconnecting

#### Scenario: Manual disconnect cancelled due to unsaved changes
- **WHEN** the user clicks "Cancel" on any unsaved-changes prompt during disconnect
- **THEN** system aborts the disconnect and the session remains active

#### Scenario: Manual disconnect with no dirty tabs
- **WHEN** the user clicks disconnect and all tabs for the active session have `isDirty: false`
- **THEN** system proceeds with disconnect immediately without prompting

### Requirement: ISshClient exposes disconnectAll
The `ISshClient` port interface MUST expose a `disconnectAll(): Promise<void>` method that disconnects all active sessions.

#### Scenario: disconnectAll iterates all sessions
- **WHEN** `disconnectAll()` is called with 3 active sessions
- **THEN** all 3 sessions are terminated and removed from the sessions map
