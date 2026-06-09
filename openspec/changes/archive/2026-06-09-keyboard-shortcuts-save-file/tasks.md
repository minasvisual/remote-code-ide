## 1. Fix Ctrl+S stale closure in MonacoWrapper

- [x] 1.1 In `MonacoWrapper.tsx`, add `saveActiveFileRef = useRef(saveActiveFile)` and update it each render with `saveActiveFileRef.current = saveActiveFile`
- [x] 1.2 Change the `addCommand` call to `() => saveActiveFileRef.current()` so the registered handler always calls the latest function
- [x] 1.3 Remove `saveActiveFile` from `handleMount`'s `useCallback` deps (replace with the ref) to prevent unnecessary re-creation

## 2. Add `cycleTab` to EditorContext

- [x] 2.1 Add `cycleTab(delta: 1 | -1): void` to the `EditorContextValue` interface in `EditorContext.tsx`
- [x] 2.2 Implement `cycleTab` as a `useCallback` that computes `(currentIndex + delta + tabs.length) % tabs.length` and calls `setActiveTabId`
- [x] 2.3 Expose `cycleTab` in the `EditorContext.Provider` value prop

## 3. Create `useKeyboardShortcuts` hook

- [x] 3.1 Create `src/renderer/application/hooks/useKeyboardShortcuts.ts`
- [x] 3.2 Accept `{ closeTab, cycleTab }` callbacks; store them in refs so the effect never needs to re-register
- [x] 3.3 Register a single `keydown` listener on `document` in `useEffect` (cleanup on unmount)
- [x] 3.4 Handle `Ctrl+W`: skip if focus is `HTMLInputElement` or `HTMLTextAreaElement`; otherwise call `closeTab(activeTabId)` — read `activeTabId` via ref
- [x] 3.5 Handle `Ctrl+Tab` (no Shift): call `cycleTab(1)` and `preventDefault()`
- [x] 3.6 Handle `Ctrl+Shift+Tab`: call `cycleTab(-1)` and `preventDefault()`

## 4. Wire hook into App

- [x] 4.1 In `App.tsx` (or the root renderer component), call `useKeyboardShortcuts` passing `closeTab` and `cycleTab` from `useEditor()`; pass `activeTabId` as well

## 5. Tests

- [x] 5.1 Add unit test for `cycleTab` in `EditorContext` — verify wrap-around with multiple tabs and no-op with a single tab
- [x] 5.2 Add unit test for `useKeyboardShortcuts` — simulate `keydown` events and assert correct callbacks fire; assert `closeTab` is NOT called when focus is in an `<input>`
- [x] 5.3 Update the existing `MonacoWrapper` test (if any) to verify `saveActiveFile` is called after a simulated tab switch
