## Why

The app lacks any built-in information about itself — users have no way to check the current version, see release notes, or find documentation on keyboard shortcuts and features without leaving the app. Adding an About panel to the sidebar centralises this information in the same UI paradigm already used for Explorer, Connections, and Extensions.

## What Changes

- New "About" entry added to the `ActivityBar` (Info icon — circle with an "i"), positioned at the bottom of the icon list
- New `AboutPanel` sidebar view with two tabs: **About** and **Docs**
  - **About tab**: app name, version (from `package.json`), author, Node.js version, Electron version, changelog/release notes section
  - **Docs tab**: keyboard shortcuts reference table, feature instructions, FAQ
- The `ide-layout` sidebar switch in `App.tsx` gains a new `about` case

## Capabilities

### New Capabilities

- `about-panel`: Sidebar panel with About and Docs tabs; exposes app metadata (version, Node/Electron runtime), changelog, keyboard shortcuts reference, and FAQ

### Modified Capabilities

- `ide-layout`: ActivityBar gains a new bottom-anchored "About" icon entry; sidebar switch handles the new `about` view

## Impact

- `src/renderer/ui/components/layout/ActivityBar.tsx` — add `about` item (bottom-positioned)
- `src/renderer/ui/components/about/` — new component directory (`AboutPanel.tsx`, `AboutTab.tsx`, `DocsTab.tsx`)
- `src/renderer/App.tsx` — add `about` case to sidebar view switch
- `openspec/specs/ide-layout/spec.md` — delta for new ActivityBar entry
- No IPC changes needed; version/runtime info is read via `process.versions` in the renderer (Electron exposes this through the existing context bridge or directly via `window.electron.process`)
- No new dependencies required
