# Renderer Process — Agent Guide

React 18 + TypeScript. Runs in Chromium. No Node.js APIs.
Communicates with main process only through `window.api` (typed as `IRemoteApi`).

## State Architecture

Two React contexts own all shared state:

| Context | Owns | File |
|---|---|---|
| `AppContext` | connections list, active session, notifications, connect/disconnect | `application/contexts/AppContext.tsx` |
| `EditorContext` | open tabs, dirty flags, active tab, save | `application/contexts/EditorContext.tsx` |

Both contexts call `getRemoteApi()` from `adapters/api/WindowRemoteApi.ts` — **never call `window.api` directly**.

## How to Access State in a Component

```typescript
import { useApp } from '../../../application/contexts/AppContext'
import { useEditor } from '../../../application/contexts/EditorContext'

function MyComponent() {
  const { activeSession, notify } = useApp()
  const { tabs, saveActiveFile } = useEditor()
  // ...
}
```

## How to Call an IPC Method

```typescript
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'

// Inside a component or hook:
const api = getRemoteApi()
const nodes = await api.sftp.listDir(sessionId, '/var/www')
```

## Adding a New Feature to a Context

```typescript
// 1. Add the method/state to the context value interface
interface AppContextValue {
  myNewState: string
  doNewThing(param: string): Promise<void>
}

// 2. Implement in AppProvider
const doNewThing = useCallback(async (param: string) => {
  const result = await api.myDomain.myAction(param)
  // update local state
}, [api])

// 3. Include in the Provider value prop
<AppContext.Provider value={{ ..., myNewState, doNewThing }}>
```

## Component Conventions

- All components live under `ui/components/<feature>/`
- Use `commons/` for reusable primitives: `Button`, `Input`, `Modal`, `Spinner`, `Notification`
- Props are typed inline with `interface Props { ... }` — no `FC<>` wrapper
- Event handlers are `useCallback` to avoid stale closures
- Async operations: set loading state → call api → set result or notify error

## Notification Pattern

```typescript
const { notify } = useApp()
notify('success', 'File saved')
notify('error', `Failed: ${err.message}`)
notify('info', 'Disconnected')
```

Notifications auto-dismiss after 4 seconds. Click to dismiss early.

## EditorTab Model

```typescript
interface EditorTab {
  id: string           // uuid, unique per open instance
  sessionId: string    // which SSH session owns this tab
  remotePath: string   // absolute path on the server e.g. /var/www/index.php
  localTempPath: string
  filename: string
  language: string     // Monaco language id: 'typescript', 'python', etc.
  content: string      // current in-memory text
  isDirty: boolean     // true = unsaved changes
  isLoading: boolean
  isSaving: boolean
}
```

## Language Detection

Language is auto-detected by extension in `EditorContext.tsx` using `LANGUAGE_MAP`.
To add a new mapping:
```typescript
// In EditorContext.tsx, add to LANGUAGE_MAP:
const LANGUAGE_MAP: Record<string, string> = {
  // existing...
  myext: 'mylanguage'  // maps .myext files to Monaco language id
}
```

## Monaco Editor Rules

- `MonacoWrapper.tsx` is the ONLY file that imports from `@monaco-editor/react`
- All other components interact with editor state via `useEditor()`
- Models are keyed by `remote://<sessionId><remotePath>` URI to preserve undo history across tab switches
- `Ctrl+S` / `Cmd+S` → `saveActiveFile()` is registered inside `handleMount`, not via a global `keydown` listener

## VSCode Extensions (OpenVSX)

- `ExtensionsPanel.tsx` — searches `https://open-vsx.org/api/-/search`
- Extensions are loaded via the `vscode` API shim (`@codingame/monaco-vscode-api`)
- The `vscode` npm alias is already configured in `package.json`; extensions can
  `import * as vscode from 'vscode'` and get the full compatibility surface

## File Explorer Rules

- `FileExplorer` loads only the root (`/`) on mount; children are lazy-loaded
- `TreeNode` fetches children on first expand via `api.sftp.listDir`
- Already-loaded nodes cache their children in local state; `isLoaded` flag prevents re-fetch
- File icons are mapped by extension in `TreeNode.tsx` `FILE_ICONS` constant
- Opening a file that already has a tab brings that tab to focus (dedup in `EditorContext.openFile`)

## Styling Rules

- Always use `ide-*` Tailwind tokens (never hardcode hex)
- Hover states: `hover:bg-ide-hover`
- Borders: `border-ide-border`
- Interactive text: `text-ide-text`, muted: `text-ide-text-muted`
- Accent/primary actions: `bg-ide-accent hover:bg-ide-accent-hover`
- Status bar + activity bar have their own tokens: `bg-ide-statusbar`, `bg-ide-activitybar`
