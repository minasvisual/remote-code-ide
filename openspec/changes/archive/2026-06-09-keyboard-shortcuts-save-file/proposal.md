## Why

`Ctrl+S` is registered inside `handleMount`, which fires only once on editor mount. The `saveActiveFile` reference captured there becomes stale after tab switches, so saves silently fail. Users also expect common IDE shortcuts (close tab, cycle tabs) that currently don't exist.

## What Changes

- Fix stale-closure bug: route `Ctrl+S` through a `useRef` so the command always calls the current `saveActiveFile`
- Add global keyboard shortcuts outside the Monaco editor: `Ctrl+W` closes the active tab, `Ctrl+Tab` / `Ctrl+Shift+Tab` cycles between open tabs
- Register global shortcuts via a `useEffect` on `document` in `App.tsx` so they work regardless of focus

## Capabilities

### New Capabilities
- `keyboard-shortcuts`: Global and editor-level keyboard shortcuts for file save, tab close, and tab navigation

### Modified Capabilities
- `monaco-editor`: Fix stale closure on Ctrl+S command — the registered handler must always reflect the current active tab state

## Impact

- `src/renderer/ui/components/editor/MonacoWrapper.tsx` — replace `addCommand` closure with a ref-forwarded call
- `src/renderer/App.tsx` (or equivalent root) — add `useEffect` keydown listener for global shortcuts
- `src/renderer/application/contexts/EditorContext.tsx` — expose `closeTab` and tab cycling from context (already exports `closeTab`; may need `cycleTab` or leverage existing `setActiveTab`)
- No IPC changes, no main-process changes
