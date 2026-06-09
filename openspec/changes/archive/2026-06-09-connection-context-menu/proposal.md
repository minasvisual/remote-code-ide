## Why

The inline delete button on connection items is easy to trigger accidentally and adds visual clutter. Editing a connection is also not possible today — users must delete and re-create it. A right-click context menu consolidates destructive and edit actions behind an intentional gesture.

## What Changes

- Remove the 🗑 inline delete button from each connection list item in `ConnectionManager`
- Add `onContextMenu` handler to connection items that opens a positioned context menu
- Context menu exposes two actions: **Edit** and **Delete**
- **Edit**: opens `ConnectionForm` pre-populated with the selected connection's data; saves via `updateConnection`
- **Delete**: opens a confirmation modal requiring the user to type `excluir` before the deletion proceeds
- `ConnectionForm` extended to support both create and edit modes

## Capabilities

### New Capabilities
- `connection-context-menu`: Right-click context menu on connection items with Edit and Delete actions
- `connection-edit`: Edit an existing saved connection via a pre-populated form

### Modified Capabilities
- `connection-management`: "Deletar conexão" requirement changes — deletion is now triggered from the context menu with a typed confirmation, not from an inline button

## Impact

- `src/renderer/ui/components/connections/ConnectionManager.tsx` — remove delete button, add context menu state and handler
- `src/renderer/ui/components/connections/ConnectionForm.tsx` — accept optional `connection?: Connection` prop for edit mode
- New component: `src/renderer/ui/components/connections/ConnectionContextMenu.tsx`
- New component: `src/renderer/ui/components/connections/DeleteConnectionModal.tsx`
- No IPC changes — `updateConnection` and `deleteConnection` already exist in `AppContext`
