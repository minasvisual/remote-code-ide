## ADDED Requirements

### Requirement: New File button in explorer root toolbar
The system SHALL display a "New File" button in the FileExplorer root toolbar, next to the existing Refresh button. Clicking it SHALL open the NewFileDialog targeting the session's root directory (`initialDirectory || '/'`).

#### Scenario: Button visible when session is active
- **WHEN** a session is active and the file explorer is displayed
- **THEN** a "New File" button (or icon) is visible in the toolbar alongside the Refresh button

#### Scenario: Open dialog on click
- **WHEN** the user clicks the "New File" button in the toolbar
- **THEN** the NewFileDialog opens with the target path set to `activeSession.initialDirectory || '/'`

#### Scenario: File created at root
- **WHEN** the user submits a valid filename in the NewFileDialog triggered from the root toolbar
- **THEN** an empty file is created at `<rootDir>/<filename>` and the root file list is reloaded from the server to reflect the new state

### Requirement: New File entry in folder context menu
The system SHALL include a "New File" item in the context menu of directory nodes in the file tree. Selecting it SHALL open the NewFileDialog targeting that folder's path.

#### Scenario: Context menu shows New File for directories
- **WHEN** the user right-clicks a directory node in the explorer
- **THEN** the context menu includes a "New File" option

#### Scenario: Context menu does not show New File for files
- **WHEN** the user right-clicks a file node in the explorer
- **THEN** the context menu does NOT include a "New File" option

#### Scenario: Open dialog from folder context menu
- **WHEN** the user selects "New File" from a directory node's context menu
- **THEN** the NewFileDialog opens with the target path set to that directory's path

#### Scenario: File created inside folder
- **WHEN** the user submits a valid filename in the NewFileDialog triggered from a folder context menu
- **THEN** an empty file is created at `<folderPath>/<filename>`, the folder's children list is reloaded from the server via `listDir`, and the folder is shown expanded with the updated contents

### Requirement: NewFileDialog — filename input modal
The system SHALL present a modal dialog with a filename text input when creating a new file. The dialog SHALL validate the input before submission.

#### Scenario: Dialog opens with empty input
- **WHEN** the NewFileDialog is opened
- **THEN** the filename input field is focused and empty

#### Scenario: Submit with Enter key
- **WHEN** the user types a filename and presses Enter
- **THEN** the dialog submits the filename (equivalent to clicking Create)

#### Scenario: Cancel closes dialog
- **WHEN** the user clicks Cancel or presses Escape
- **THEN** the dialog closes without creating any file

#### Scenario: Empty filename is rejected
- **WHEN** the user submits an empty or whitespace-only filename
- **THEN** the dialog does not submit and remains open

#### Scenario: Filename with slash is rejected
- **WHEN** the user submits a filename containing a `/` character
- **THEN** the dialog does not submit and remains open

#### Scenario: Filename already exists is rejected inline
- **WHEN** the user submits a filename that already exists at the target path on the server
- **THEN** the dialog does not close; an inline error message "A file named '<filename>' already exists" is shown and the input remains editable

#### Scenario: SFTP error surfaces as notification
- **WHEN** the SFTP createFile call fails for a reason other than file existence (e.g., permission denied)
- **THEN** the dialog closes and an error notification is displayed; no file appears in the tree
