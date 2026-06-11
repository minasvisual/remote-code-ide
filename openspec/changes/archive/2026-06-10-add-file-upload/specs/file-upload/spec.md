## ADDED Requirements

### Requirement: Upload button in file explorer root toolbar
The file explorer header toolbar SHALL include an Upload button with a folder-with-upward-arrow icon. The button SHALL be visible whenever a session is active and the explorer is showing.

#### Scenario: Upload button is present in toolbar
- **WHEN** a user has an active SSH session and the file explorer is open
- **THEN** an Upload button (folder + arrow-up icon) is visible in the explorer header toolbar alongside New File, New Folder, and Refresh buttons

#### Scenario: Clicking upload button opens native file picker
- **WHEN** the user clicks the Upload toolbar button
- **THEN** the native OS file picker dialog opens allowing selection of one or more files or entire folders

#### Scenario: User cancels the file picker
- **WHEN** the user opens the file picker and dismisses it without selecting anything
- **THEN** no upload dialog is shown and no SFTP operation is initiated

---

### Requirement: Native file picker supports multi-file and folder selection
The OS file picker opened for upload SHALL allow the user to select multiple files, multiple folders, or a mix of both in a single dialog invocation.

#### Scenario: User selects multiple files
- **WHEN** the user selects two or more files in the file picker and confirms
- **THEN** all selected files are queued for upload to the target directory

#### Scenario: User selects a folder
- **WHEN** the user selects a folder in the file picker and confirms
- **THEN** the folder and all its nested files and subfolders are queued for upload, preserving directory structure relative to the selected folder's parent

---

### Requirement: Upload progress dialog
When an upload is initiated, the system SHALL display a modal dialog showing per-file upload status until all files have been processed.

#### Scenario: Progress dialog appears immediately after selection
- **WHEN** the user confirms file selection in the file picker
- **THEN** an upload progress dialog opens listing all files to be uploaded with initial status "pending"

#### Scenario: Per-file status updates during upload
- **WHEN** a file begins uploading
- **THEN** its row in the progress dialog updates to show "uploading" status
- **WHEN** the file completes successfully
- **THEN** its row updates to show "done" status

#### Scenario: Per-file error is shown without aborting remaining uploads
- **WHEN** an individual file upload fails (e.g. permission denied)
- **THEN** its row shows an "error" status with the error message, and upload continues for the remaining files

#### Scenario: Dialog stays open until user dismisses it
- **WHEN** all files have finished (done or error)
- **THEN** a "Close" button becomes enabled and the user can dismiss the dialog

#### Scenario: Dialog cannot be dismissed while upload is in progress
- **WHEN** at least one file has status "uploading" or "pending"
- **THEN** the "Close" button is disabled and clicking outside the dialog does not close it

---

### Requirement: Recursive folder upload preserves directory structure
When a folder is selected for upload, the system SHALL recursively traverse all nested files and subdirectories and recreate the directory structure on the remote server.

#### Scenario: Nested subdirectories are created on the remote
- **WHEN** the user uploads a folder containing nested subdirectories
- **THEN** the system creates each subdirectory on the remote before uploading its files, using the same relative paths as the source

#### Scenario: Existing remote directories are silently reused
- **WHEN** a remote directory with the same path already exists during recursive upload
- **THEN** the system does not error out; it continues uploading files into the existing directory

---

### Requirement: Existing remote files are overwritten by default
When an uploaded file's remote path already exists, the system SHALL overwrite the existing remote file without any confirmation prompt.

#### Scenario: Overwrite existing file silently
- **WHEN** the user uploads a file whose name matches an existing file in the target directory
- **THEN** the existing remote file is replaced with the uploaded content, and the progress dialog shows "done" (no warning)

---

### Requirement: File explorer refreshes after upload completes
After the upload dialog is dismissed, the file explorer tree SHALL reflect any newly uploaded files and directories.

#### Scenario: Tree refreshes after successful upload
- **WHEN** the upload progress dialog is closed after one or more successful uploads
- **THEN** the target directory's subtree in the file explorer is refreshed to show the new files
