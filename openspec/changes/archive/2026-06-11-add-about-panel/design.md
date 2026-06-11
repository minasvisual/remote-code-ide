## Context

The app currently has three sidebar panels (Explorer, Connections, Extensions) wired through `ActivityBar` → `sidebarView` state in `IDELayout` → sidebar switch in `App.tsx`. Adding a fourth panel follows the same pattern exactly.

The main constraint is that `contextIsolation: true` / `nodeIntegration: false` is set in the `BrowserWindow`, so the renderer cannot access `process.versions` directly. Runtime metadata must be exposed through the preload's `contextBridge`.

## Goals / Non-Goals

**Goals:**
- Add an About icon at the bottom of the ActivityBar
- Render a sidebar panel with two tabs: About and Docs
- Expose Node.js / Electron / Chromium version strings to the renderer via preload
- Show app version (from `package.json` baked in at build time via Vite `define`)
- Docs tab: static keyboard shortcut table, feature instructions, FAQ section

**Non-Goals:**
- Fetching changelog from a remote URL or GitHub API
- Dynamic/live shortcut detection
- Internationalisation / i18n
- Persisting which tab was last selected

## Decisions

### 1 — About icon position: bottom of ActivityBar

The About item is metadata, not a workflow tool. VS Code anchors "Account" and "Settings" at the bottom; the same pattern applies here. Achieved by splitting `ITEMS` into `topItems` and `bottomItems` in `ActivityBar.tsx`, using `flex-col` + `mt-auto` for bottom items.

*Alternative considered:* append it at the end of the existing `ITEMS` array (simpler, no layout change). Rejected — it would visually group About with Explorer/Connections, implying it is a primary workflow panel.

### 2 — Runtime version info via preload `contextBridge`

Add a `versions` field to the existing `contextBridge.exposeInMainWorld('api', ...)` call in `preload/index.ts`, exposing `process.versions.node`, `process.versions.electron`, `process.versions.chrome`, and `app.getVersion()` via a new IPC call `app:version`.

*Alternative considered:* Vite `define` to inject `__APP_VERSION__` at build time. Used for `package.json` version (simpler, no round-trip), but cannot expose Node/Electron/Chromium versions this way.

*Alternative considered:* Separate `contextBridge.exposeInMainWorld('versions', ...)` call. Rejected — the codebase convention is a single `api` surface; adding a second global key would deviate from it.

### 3 — Tab state: local `useState` in `AboutPanel`

The active tab (About / Docs) is purely UI state local to the panel. No context is needed.

### 4 — Keyboard shortcuts table: static data array in `DocsTab`

All shortcuts are documented in `openspec/specs/keyboard-shortcuts/spec.md` and do not change at runtime. A hardcoded `SHORTCUTS` constant in the component is sufficient. No need for a data-driven approach from the spec file.

### 5 — Changelog: static hardcoded list for now

No external fetch. A `CHANGELOG` constant in `AboutTab.tsx` with a short initial entry is enough to demonstrate the capability. Future changes can update this array.

## Risks / Trade-offs

- **Stale changelog** → The `CHANGELOG` constant must be maintained manually alongside releases. Mitigation: document this in the component as a convention; a future change can automate it.
- **Electron version** reads `process.versions.electron` from the preload; if the preload is not rebuilt, it can show a stale value in dev. Mitigation: this is a non-issue — the preload is rebuilt by `electron-vite` on every dev start.
- **ActivityBar layout change** introduces a flex-layout split that is a minor visual change to all ActivityBar renders. Risk is low — the change is purely positional and the test suite covers sidebar navigation.

## Migration Plan

1. Add `versions` to preload `contextBridge` + `IRemoteApi` type
2. Register `app:version` IPC handler in `main/index.ts`
3. Create `AboutPanel`, `AboutTab`, `DocsTab` components
4. Update `ActivityBar` to split top/bottom items
5. Update `App.tsx` sidebar switch to handle `about`
6. Update `ide-layout` spec delta with new ActivityBar requirement
