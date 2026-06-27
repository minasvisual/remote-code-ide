## Why

The IDE layout currently uses fixed percentages for the sidebar (w-60 / 240px), editor area (65%), and terminal panel (35%). Users cannot adjust these proportions, which hurts usability — a wide file tree is needed when navigating deep folder structures, and a taller terminal is needed for log-heavy workflows. Additionally, when switching editor tabs, Monaco loses fold state and cursor position, forcing users to re-navigate every time they return to a file.

## What Changes

- **Resizable sidebar**: The file explorer / sidebar panel gets a drag handle on its right edge so users can resize it horizontally.
- **Resizable terminal**: The terminal panel gets a drag handle on its top edge so users can resize it vertically relative to the editor area.
- **Editor view state preservation**: When switching tabs, Monaco's view state (cursor position, scroll position, fold state, selection) is saved and restored per tab.

## Capabilities

### New Capabilities

- `resizable-panels`: Drag-to-resize handles between sidebar/editor and editor/terminal areas, with min/max constraints and persisted sizes.
- `editor-view-state`: Save and restore Monaco editor view state (cursor, scroll, folds, selection) per tab across tab switches.

### Modified Capabilities

_(none — these are additive UI enhancements with no spec-level behavior changes to existing capabilities)_

## Impact

- **Renderer only** — no IPC, main-process, or domain changes needed.
- **Files affected**:
  - `src/renderer/App.tsx` — replace fixed layout sizing with resizable panel logic and drag handles.
  - `src/renderer/ui/components/editor/MonacoWrapper.tsx` — save/restore view state on tab switch using Monaco's `saveViewState()` / `restoreViewState()`.
  - `src/renderer/application/contexts/EditorContext.tsx` — may store view state map if needed.
- **Dependencies**: No new npm packages required — drag resize can be implemented with native mouse events and CSS. Monaco has built-in `saveViewState()` / `restoreViewState()` APIs.
- **Risk**: Low — purely additive UI changes with no backend or security surface.
