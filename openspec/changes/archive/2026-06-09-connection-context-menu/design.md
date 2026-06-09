## Context

`ConnectionManager.tsx` currently shows an inline 🗑 delete button that appears on hover. There is no edit flow — `ConnectionForm` only supports creating new connections. `updateConnection` already exists in `AppContext` and the IPC layer is complete; only the UI is missing.

The `Connection` entity does not return plaintext credentials after save (only `encryptedPassword` / `encryptedPrivateKey` opaque fields), so an edit form cannot pre-fill credential fields — the user fills them only when they want to change the credentials.

## Goals / Non-Goals

**Goals:**
- Right-click on a connection item opens a positioned context menu with "Edit" and "Delete"
- Edit opens `ConnectionForm` in edit mode with non-credential fields pre-populated
- Delete opens a typed-confirmation modal requiring the user to type `excluir`
- Inline delete button is removed entirely
- No new npm dependencies

**Non-Goals:**
- Drag-to-reorder connections
- Bulk delete
- Keyboard-only context menu triggering (right-click only)

## Decisions

### 1 — Custom positioned `ConnectionContextMenu` component, not the native `<menu>`

**Decision**: A React component that renders an absolutely-positioned `<div>` at `(x, y)` captured from the `contextmenu` event. It is mounted inside `ConnectionManager` and dismissed on outside click or `Escape`.

**Alternatives considered**:
- *Native `<menu contextmenu>`*: Poor cross-platform support in Electron's Chromium; no styling control.
- *Electron `Menu.buildFromTemplate` via IPC*: Would require a new IPC channel and main-process logic for a purely UI concern; over-engineered.

### 2 — `ConnectionForm` extended with optional `connection?: Connection` prop

**Decision**: When `connection` is provided, the form enters edit mode: title changes to "Edit Connection", non-credential fields are pre-populated, credential inputs start empty with placeholder text explaining they are optional. On save, if a credential field is blank the `NewConnection` object omits it, and the main-process adapter keeps the existing encrypted value.

**Alternatives considered**:
- *Separate `EditConnectionForm` component*: Duplicates the entire form. The existing form is small enough to parameterize cleanly.

**Credential handling in edit mode**: The main-process `update` handler already merges: if `plainPassword` / `plainPrivateKey` are absent from the payload, it keeps the stored encrypted value. No adapter change needed.

### 3 — Typed confirmation via `DeleteConnectionModal`

**Decision**: A modal that renders an `<input>` and enables the "Delete" button only when its value equals `"excluir"` (case-insensitive). On confirm, calls `deleteConnection(id)` and closes.

**Alternatives considered**:
- *Standard "Are you sure?" confirm dialog*: Too easy to accidentally confirm; the typed confirmation adds intentional friction for a destructive action.
- *Native `window.confirm()`*: Cannot be styled; blocked by Electron's CSP; no i18n.

### 4 — Outside-click dismissal via `useEffect` on `document`

The context menu attaches a one-time `mousedown` listener on `document` when open, removing itself on first fire. This is cheaper than a global always-on listener.

## Risks / Trade-offs

- [Context menu position near screen edge] The menu may clip outside the viewport if opened near the right or bottom edge.  
  → Mitigation: clamp `x`/`y` using `window.innerWidth` / `window.innerHeight` minus menu dimensions (estimated or measured via `getBoundingClientRect` after render).
- [Edit form empty credential fields] Users unfamiliar with the UX may think they must re-enter credentials every time.  
  → Mitigation: placeholder text on credential inputs reads "Leave blank to keep current".

## Open Questions

- Should the confirmation word be localized (e.g., accept both `excluir` and `delete`)? Out of scope for now; accept only `excluir`.
