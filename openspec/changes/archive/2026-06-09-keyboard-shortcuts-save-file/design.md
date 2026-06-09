## Context

`MonacoWrapper.tsx` registers `Ctrl+S` by calling `editor.addCommand()` inside `handleMount`. The callback is `() => saveActiveFile()`, where `saveActiveFile` comes from `useCallback` with `[tabs, activeTabId, ...]` as deps. Although `handleMount` re-creates when `saveActiveFile` changes, the Monaco `Editor`'s `onMount` prop fires **only once** on initial mount — subsequent re-renders with a new `handleMount` do not re-register the command. The result: after the first tab switch the registered handler silently calls a stale closure that sees the wrong `activeTabId`.

Global shortcuts (close tab, cycle tabs) do not exist at all.

## Goals / Non-Goals

**Goals:**
- `Ctrl+S` / `Cmd+S` always saves the currently active tab, regardless of how many tabs have been opened or switched
- `Ctrl+W` closes the active tab (global, works even if focus is outside Monaco)
- `Ctrl+Tab` / `Ctrl+Shift+Tab` cycles forward/backward through open tabs
- No new npm dependencies

**Non-Goals:**
- User-configurable key bindings
- System-level (Electron `globalShortcut`) shortcuts outside the app window
- Shortcuts for operations other than save/close/cycle

## Decisions

### 1 — Fix stale closure with a `useRef` forwarding pattern

**Decision**: In `MonacoWrapper`, maintain `saveActiveFileRef = useRef(saveActiveFile)` and update it every render. Pass `() => saveActiveFileRef.current()` to `addCommand`. The command is registered once but always calls the latest function.

**Alternatives considered**:
- *Re-register command on every `saveActiveFile` change* — requires `editor.dispose()` + remount or internal Monaco API that is not public; fragile.
- *Move `addCommand` to a separate `useEffect([saveActiveFile])`* — Monaco's `addCommand` returns a context key disposable. Calling it again would stack duplicate handlers; would need to track and dispose the previous one. More code, same result.

The ref pattern is the idiomatic React fix for stale closures in one-time callbacks.

### 2 — Global shortcuts via a `useKeyboardShortcuts` hook on `document`

**Decision**: Create `src/renderer/application/hooks/useKeyboardShortcuts.ts`. It attaches a single `keydown` listener to `document` in a `useEffect`. `App.tsx` calls it once. Callbacks are forwarded through refs (same pattern as Decision 1) to stay fresh.

**Alternatives considered**:
- *Inline `useEffect` in `App.tsx`* — works but mixes concerns into the top-level component.
- *Electron `ipcRenderer` shortcut forwarding* — unnecessary complexity; renderer-level listener suffices since the window is always focused when the user types.

### 3 — Tab cycling as `cycleTab(delta: 1 | -1)` on `EditorContext`

**Decision**: Add `cycleTab` to `EditorContext`/`EditorContextValue`. It computes the next tab index by wrapping around `tabs` array with the given delta. The hook calls `cycleTab(1)` / `cycleTab(-1)`.

**Alternatives considered**:
- *Compute next tab in the hook itself* — requires reading `tabs` and `activeTabId` directly in the hook, creating a second consumer path for the same logic.

### 4 — Prevent default on captured shortcuts

The global listener calls `event.preventDefault()` for all captured combinations to suppress browser built-ins (e.g., Chrome's Ctrl+W closes the tab in a browser context, not needed in Electron but still good practice). Monaco's internal handler for Ctrl+S is already suppressed by `addCommand`.

## Risks / Trade-offs

- [Ctrl+W conflicts with text editing] In some terminal or input scenarios, Ctrl+W may be expected to delete a word. The global listener checks `event.target` and skips if focus is inside a `<textarea>` or `<input>`.  
  → Mitigation: guard `if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return`
- [React ref timing] `saveActiveFileRef.current` is updated in the render phase synchronously before the effect runs, so there is no window where the ref is stale.  
  → No mitigation needed; this is the defined behavior of `useRef` updates.

## Migration Plan

Pure additive change in the renderer; no IPC or main-process modifications. No migration needed.

## Open Questions

- Should `Ctrl+Shift+S` trigger "save all dirty tabs"? Out of scope for now; can be added as a follow-up.
