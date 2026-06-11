## ADDED Requirements

### Requirement: Context menu appears on right-click of tree node
Right-clicking any file or folder node in the connected server's file explorer SHALL display a context menu with actions relevant to that node type.

#### Scenario: Right-click on a file node
- **WHEN** the user right-clicks on a file in the file explorer tree
- **THEN** a context menu appears near the cursor with "Rename" and "Delete" options

#### Scenario: Right-click on a directory node
- **WHEN** the user right-clicks on a folder in the file explorer tree
- **THEN** a context menu appears near the cursor with "Rename" and "Delete" options

#### Scenario: Context menu dismisses on outside click
- **WHEN** a context menu is open and the user clicks anywhere outside it
- **THEN** the context menu closes without performing any action

#### Scenario: Context menu dismisses on Escape key
- **WHEN** a context menu is open and the user presses the Escape key
- **THEN** the context menu closes without performing any action

#### Scenario: Only one context menu is open at a time
- **WHEN** a context menu is already open and the user right-clicks a different node
- **THEN** the previous context menu closes and a new one opens for the newly right-clicked node

---

### Requirement: Delete action requires confirmation before execution
The Delete action in the context menu SHALL present a confirmation dialog before issuing any SFTP delete call. The dialog message SHALL differ based on node type to make the destructive scope explicit.

#### Scenario: User confirms delete of a file
- **WHEN** the user clicks "Delete" in the context menu for a file and then confirms in the dialog
- **THEN** the system calls `api.sftp.delete(sessionId, path)` (unlink) and removes the node from the tree

#### Scenario: Confirmation dialog for a folder warns about recursive deletion
- **WHEN** the user clicks "Delete" in the context menu for a folder
- **THEN** the confirmation dialog MUST display the message: `"This will permanently delete the folder \"<name>\" and ALL its contents. This cannot be undone."` before any SFTP call is made

#### Scenario: User confirms delete of a folder
- **WHEN** the user clicks "Delete" in the context menu for a folder and then confirms in the dialog
- **THEN** the system calls `api.sftp.deleteRecursive(sessionId, path)` which removes the folder and all its nested files and subdirectories, then removes the node from the tree

#### Scenario: User cancels delete
- **WHEN** the user clicks "Delete" in the context menu and then clicks "Cancel" in the confirmation dialog
- **THEN** no SFTP call is made and the tree is unchanged

#### Scenario: Delete fails (e.g. permission error during recursive deletion)
- **WHEN** the SFTP delete call returns an error
- **THEN** an error notification is shown via `notify('error', ...)` and the node remains in the tree

---

### Requirement: Rename action uses inline edit-in-place
The Rename action in the context menu SHALL replace the node label with an input field pre-filled with the current name, allowing the user to type a new name.

#### Scenario: User commits rename with Enter key
- **WHEN** the user clicks "Rename", modifies the name in the inline input, and presses Enter
- **THEN** the system calls `api.sftp.rename(sessionId, oldPath, newPath)` and the node label updates to the new name

#### Scenario: User commits rename by blurring the input
- **WHEN** the user clicks "Rename", modifies the name in the inline input, and clicks elsewhere
- **THEN** the system calls `api.sftp.rename(sessionId, oldPath, newPath)` and the node label updates to the new name

#### Scenario: User cancels rename with Escape key
- **WHEN** the user clicks "Rename" and then presses Escape without committing
- **THEN** no SFTP call is made and the node label reverts to its original name

#### Scenario: Rename fails
- **WHEN** the SFTP rename call returns an error
- **THEN** an error notification is shown via `notify('error', ...)` and the node label reverts to its original name

#### Scenario: Rename with empty input is rejected
- **WHEN** the user clears the inline input and presses Enter (or blurs)
- **THEN** no SFTP call is made, the node label reverts to its original name, and an error notification is shown
