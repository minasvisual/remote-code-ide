## 1. ResizeHandle Component

- [x] 1.1 Create `src/renderer/ui/components/commons/ResizeHandle.tsx` — a reusable drag handle component accepting `direction: 'horizontal' | 'vertical'` and `onResize(delta: number)` callback. Renders a thin bar with `col-resize` / `row-resize` cursor. Uses mousedown → document mousemove/mouseup with a transparent overlay during drag to prevent text selection and ensure smooth tracking.

## 2. Resizable Sidebar

- [x] 2.1 In `App.tsx`, replace the fixed `w-60` sidebar with a `useState<number>(240)` for sidebar width. Apply the width via inline `style={{ width }}` with min 150px / max 500px clamping.
- [x] 2.2 Add a `ResizeHandle direction="horizontal"` between the sidebar and main area in the layout. Wire `onResize` to update the sidebar width state.

## 3. Resizable Terminal Panel

- [x] 3.1 In `App.tsx`, replace the hardcoded 65%/35% editor/terminal split with a `useState<number>(35)` for terminal height percentage. Apply via inline style with min 15% / max 70% clamping.
- [x] 3.2 Add a `ResizeHandle direction="vertical"` on the terminal toggle bar (replacing or integrating into the existing bar). Wire `onResize` to update terminal height percentage based on drag delta relative to the main area height.

## 4. Editor View State Preservation

- [x] 4.1 In `MonacoWrapper.tsx`, add a `useRef<Map<string, ICodeEditorViewState>>()` to store view state per tab ID.
- [x] 4.2 Before switching models (when `activeTabId` changes), call `editor.saveViewState()` and store the result in the map keyed by the outgoing tab ID.
- [x] 4.3 After setting the new model, call `editor.restoreViewState()` with the stored state for the incoming tab ID (if it exists in the map).
- [x] 4.4 Clean up: when a tab disappears from the `tabs` array, remove its entry from the view state map.

## 5. Testing & Verification

- [x] 5.1 Run `npm run typecheck` and fix any type errors.
- [x] 5.2 Run `npm run test:unit` and fix any broken tests.
- [x] 5.3 Start the dev server (`npm run dev`) and manually verify: sidebar drag resize, terminal drag resize, and editor view state preservation across tab switches.
