## Context

The IDE layout in `App.tsx` uses fixed CSS for panel sizes: the sidebar is `w-60` (240px), and when the terminal is open the editor/terminal split is hardcoded at 65%/35% via inline `style={{ height }}`. Monaco does not currently save or restore view state across tab switches — only the text model is reused (via URI-keyed models), so cursor position, scroll, and folds are lost.

## Goals / Non-Goals

**Goals:**
- Allow users to drag-resize the sidebar width (horizontal) and the editor/terminal split (vertical).
- Enforce min/max constraints so panels don't collapse to unusable sizes.
- Preserve Monaco editor view state (cursor, scroll, folds, selection) per tab when switching tabs.

**Non-Goals:**
- Persisting panel sizes across app restarts (can be added later with electron-store).
- Drag-to-resize the activity bar (it stays fixed width).
- Collapsible/hideable sidebar (toggle already exists via activity bar).
- Multi-pane / split-editor support.

## Decisions

### 1. Native drag handles vs. library

**Decision**: Implement drag handles with native mouse events (`mousedown` → `mousemove` → `mouseup`) and CSS `cursor: col-resize` / `row-resize`.

**Alternatives considered**:
- `react-resizable-panels` — adds a dependency for ~15 KB; our layout has only two split points, making a library overkill.
- CSS `resize` property — only works on overflow containers, not between sibling panels.

**Rationale**: Two drag handles are simple to implement (~60 lines each). No new dependency, full control over constraints, and matches existing "zero external UI libs" pattern.

### 2. Drag handle component

**Decision**: Create a single reusable `ResizeHandle` component in `ui/components/commons/` that accepts `direction: 'horizontal' | 'vertical'` and an `onResize(delta)` callback. The parent component manages the actual size state.

### 3. Size state management

**Decision**: Keep panel size state local to `IDELayout` in `App.tsx` using `useState`. No context needed — only `IDELayout` owns the layout geometry.

- Sidebar width: `useState<number>(240)` with min 150px, max 500px.
- Terminal height: stored as percentage `useState<number>(35)` with min 15%, max 70%.

### 4. Monaco view state preservation

**Decision**: Use Monaco's built-in `editor.saveViewState()` and `editor.restoreViewState()` APIs. Store a `Map<string, ICodeEditorViewState>` keyed by tab ID inside `MonacoWrapper` via `useRef`.

**Flow**:
1. When `activeTabId` changes, before switching models: call `saveViewState()` for the outgoing tab and store it in the map.
2. After setting the new model: call `restoreViewState()` with the stored state for the incoming tab (if any).

**Why in MonacoWrapper, not EditorContext**: View state is a Monaco-internal object — it belongs with the editor instance, not in React state. Storing it in a ref avoids unnecessary re-renders and keeps the EditorContext free of Monaco-specific types.

### 5. Cleanup on tab close

**Decision**: When a tab is closed, delete its entry from the view state map. Listen for `closeTab` by detecting when a tab disappears from the `tabs` array.

## Risks / Trade-offs

- **[View state lost on remount]** If `MonacoWrapper` unmounts (e.g., switching to WelcomeScreen and back), the ref-based view state map is lost. → Acceptable: this only happens when all tabs are closed, which means there's no state to restore anyway.
- **[Drag handle z-index conflicts]** Drag handles need to overlay neighboring panels during drag. → Mitigated by using a transparent overlay during drag to capture mouse events reliably.
- **[Terminal resize triggers xterm reflow]** Changing terminal panel height must trigger `FitAddon.fit()` on xterm. → The existing `TerminalPanel` already observes resize via `ResizeObserver`, so this should work automatically.
