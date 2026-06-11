## Why

Users need a way to transfer local files and folders to the remote server directly from the file explorer, without leaving the app. Currently MyCODEany has no upload mechanism, forcing users to switch to external tools for file transfers.

## What Changes

- Add an **Upload** button to the file explorer root toolbar (header action area)
- Add an **Upload** option to the file/folder context menu
- Implement a multi-file upload dialog with per-file progress tracking
- Support folder upload with recursive directory traversal (nested files and subfolders)
- Overwrite existing remote files by default (no confirmation prompt)
- Upload icon: folder with upward arrow symbol

## Capabilities

### New Capabilities

- `file-upload`: Upload one or more local files (or entire folder trees) to a target directory on the remote SFTP server, with an in-app dialog showing upload progress per file.

### Modified Capabilities

- `file-explorer-context-menus`: Extend the existing context menu to include an "Upload here" action for both files and folders (uploading into the parent or target directory).

## Impact

- **IPC**: New `sftp:uploadFile` channel for streaming file content from renderer to main
- **ISftpService**: New `uploadFile(localPath, remotePath)` method and `mkdir` for directory creation
- **Renderer**: New `UploadDialog` component, updated `FileExplorer` toolbar, updated `TreeNode` context menu
- **Preload**: Expose `sftp.uploadFile` and `sftp.mkdir` (mkdir may already exist)
- **Node APIs in main**: `fs.createReadStream` for reading local files (main process only)
