## Why

Two usability bugs are frustrating users on a connected session: (1) the terminal's right-click context menu renders off-screen below the window when the terminal panel is scrolled to fill available vertical space, making its items unclickable; (2) switching the sidebar away from the File Explorer (e.g. to the AI chat panel) and back unmounts and remounts `FileExplorer`, discarding all expanded-folder state and forcing a full directory re-fetch from the root. Both are pre-existing implementation gaps, not new feature requests, and are cheap to fix now.

## What Changes

- Terminal context menu (`TerminalContextMenu`) is repositioned to stay fully within the viewport, clamping against the actual rendered menu size instead of using the raw click coordinates unconditionally
- `ConnectionContextMenu`'s existing viewport-clamping logic is extracted into a shared hook so the same fix is implemented once and reused (pure refactor, no behavior change to `ConnectionContextMenu`)
- Sidebar panels (`FileExplorer`, `ConnectionManager`, `ExtensionsPanel`, `AiChatPanel`, `AboutPanel`) stay mounted simultaneously once rendered; switching the ActivityBar view toggles which one is visible instead of unmounting the others, so `FileExplorer`'s expanded folders and lazily-loaded directory listings survive a round-trip through another sidebar view

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `terminal-clipboard`: "Terminal context menu" requirement gains a scenario requiring the menu to stay fully within the window bounds even when opened near the bottom edge
- `ide-layout`: new requirement stating that sidebar panels retain their internal state when the user switches the ActivityBar view and switches back

## Impact

- `src/renderer/ui/components/terminal/TerminalContextMenu.tsx` — clamp menu position against measured size
- `src/renderer/ui/components/commons/useClampedMenuPosition.ts` (new) — shared clamping hook
- `src/renderer/ui/components/connections/ConnectionContextMenu.tsx` — refactored to use the shared hook
- `src/renderer/App.tsx` — sidebar panels rendered simultaneously (hidden via CSS) instead of an exclusive ternary
- No IPC, domain, or main-process changes
