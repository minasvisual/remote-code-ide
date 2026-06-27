## ADDED Requirements

### Requirement: Confirmation dialog on dirty tab close
The system SHALL display a confirmation dialog when the user attempts to close an editor tab that has unsaved changes (`isDirty: true`). The dialog MUST offer three actions: **Save & Close**, **Discard**, and **Cancel**.

#### Scenario: Closing a dirty tab shows the dialog
- **WHEN** user clicks the close button on a tab with `isDirty: true`
- **THEN** system displays the UnsavedChangesDialog with the filename and three action buttons

#### Scenario: User chooses Save & Close
- **WHEN** user clicks "Save & Close" in the dialog
- **THEN** system saves the file via `sftp:writeFile`, marks the tab as not dirty, closes the tab, and dismisses the dialog

#### Scenario: Save fails during Save & Close
- **WHEN** user clicks "Save & Close" and the save operation fails
- **THEN** system displays an error notification, the tab remains open, and the dialog is dismissed

#### Scenario: User chooses Discard
- **WHEN** user clicks "Discard" in the dialog
- **THEN** system closes the tab without saving and dismisses the dialog

#### Scenario: User chooses Cancel
- **WHEN** user clicks "Cancel" in the dialog
- **THEN** system dismisses the dialog and the tab remains open with its unsaved changes intact

### Requirement: Clean tabs close without confirmation
The system SHALL close editor tabs that have no unsaved changes (`isDirty: false`) immediately without showing any dialog.

#### Scenario: Closing a clean tab
- **WHEN** user clicks the close button on a tab with `isDirty: false`
- **THEN** system closes the tab immediately without any confirmation

### Requirement: Dialog displays affected filename
The UnsavedChangesDialog MUST display the filename of the tab being closed so the user knows which file has unsaved changes.

#### Scenario: Dialog shows correct filename
- **WHEN** the UnsavedChangesDialog is displayed for a tab with filename "index.ts"
- **THEN** the dialog message includes "index.ts"
