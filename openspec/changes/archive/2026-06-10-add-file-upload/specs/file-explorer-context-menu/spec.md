## ADDED Requirements

### Requirement: Upload option in file/folder context menu
The right-click context menu on file and folder nodes in the file explorer SHALL include an "Upload here" action that triggers the same upload flow as the toolbar button, scoped to the relevant target directory.

#### Scenario: Upload option appears in file node context menu
- **WHEN** the user right-clicks a file node in the file explorer
- **THEN** the context menu includes an "Upload here" option (upload into the file's parent directory)

#### Scenario: Upload option appears in directory node context menu
- **WHEN** the user right-clicks a folder node in the file explorer
- **THEN** the context menu includes an "Upload here" option (upload into that folder)

#### Scenario: Clicking "Upload here" on a file node opens file picker for parent directory
- **WHEN** the user clicks "Upload here" in the context menu of a file node
- **THEN** the native file picker opens, and upon confirmation the upload targets the file's parent directory

#### Scenario: Clicking "Upload here" on a folder node opens file picker for that directory
- **WHEN** the user clicks "Upload here" in the context menu of a folder node
- **THEN** the native file picker opens, and upon confirmation the upload targets that folder's path

#### Scenario: Upload from context menu follows the same progress dialog behavior
- **WHEN** the user initiates upload via the context menu and confirms file selection
- **THEN** the same upload progress dialog is displayed as when uploading via the toolbar button
