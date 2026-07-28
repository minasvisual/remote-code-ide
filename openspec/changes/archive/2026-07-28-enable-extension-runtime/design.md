## Context

`ExtensionsPanel.tsx` can search OpenVSX today, but two gaps make the feature dead on
arrival: `ActivityBar.tsx`'s `topItems`/`bottomItems` never include `'extensions'`, so
`sidebarView` can never become `'extensions'` from the UI — the panel is unreachable.
And `install()` only does `fetch(vsixUrl)` then discards the response, with a comment
noting real loading "happens at runtime when the service worker / extension host is
active" — which nothing in this codebase currently sets up. `MonacoWrapper.tsx` hardcodes
`theme="vs-dark"` and only imports plain `@monaco-editor/react` + `monaco-editor`; none of
the `@codingame/monaco-vscode-*` service-override packages are imported anywhere, per this
repo's own note that they cause Rollup deep-import failures with the current Vite setup.

Building a real VSCode extension host (activation contexts, `contributes.commands`,
language servers, etc.) is a multi-week effort and directly collides with that known
Rollup problem. This change instead delivers a self-contained "basic mode": extensions are
installed and tracked for real, but only the one contribution type that needs no extension
host — `contributes.themes` (plain JSON read by `monaco.editor.defineTheme`) — is actually
activated. That is enough to enable the feature, install one real OpenVSX extension, and
verify it does something observable, without touching the Rollup-fragile packages.

## Goals / Non-Goals

**Goals:**
- Make the Extensions panel reachable from the UI (`ActivityBar` entry).
- Persist installed extensions for real: download `.vsix`, unzip, parse manifest, store
  install state (enabled/disabled) across app restarts.
- Activate `contributes.themes` extensions against the live Monaco editor as a concrete,
  testable "basic mode" — installing and enabling one real theme extension measurably
  changes editor colors.
- Follow existing layering: main-process port/adapter for filesystem work, IPC channel
  per `domain:action`, renderer only via `getRemoteApi()`.

**Non-Goals:**
- No VSCode extension host, no `activate()`/JS execution from installed extensions, no
  language servers, no commands/keybindings/snippets contribution types.
- No sandboxing/signing verification of downloaded `.vsix` content beyond path-traversal
  safety during unzip (see Risks). Treat OpenVSX as a semi-trusted source, same trust
  level the existing stub already implied.
- Not importing or enabling any `@codingame/monaco-vscode-*` service override package —
  that remains explicitly out of scope per the existing repo note.

## Decisions

- **Storage location**: `app.getPath('userData')/extensions/<publisher>.<name>-<version>/`
  holds the unzipped VSIX contents; `electron-store` (`name: 'extensions'`) holds the
  installed-extension index (id, version, manifest summary, `enabled` flag), mirroring
  `ElectronStoreConnectionRepo`'s pattern. Rationale: consistent with how connections are
  persisted; keeps large binary/theme assets out of electron-store (which is JSON-backed)
  while keeping small metadata queryable without re-reading disk on every list call.
- **Unzip library**: add `extract-zip` (thin wrapper over `yauzl`, MIT, no native build
  step) as a new main-process dependency. `archiver` — already a dependency — only writes
  zips; nothing in the repo currently reads one. Alternative considered: shell out to a
  system `unzip`/`tar` — rejected, not guaranteed present on Windows.
- **Port shape**: new `IExtensionService` in `src/main/domain/ports/`, implemented by
  `VsixExtensionService` in `src/main/adapters/extensions/`, following the existing
  Ports & Adapters rule (main entities/ports have zero deps; adapters implement them).
- **IPC channels**: `extensions:install | list | uninstall | setEnabled`, `ipcMain.handle`
  and `{ success, data?, error? }` return shape — same convention as
  `connections:*`/`sftp:*`.
- **Theme activation lives in the renderer, not main**: `monaco.editor.defineTheme` is a
  Monaco API only reachable from the renderer. Main process only extracts and exposes the
  theme JSON's file path (under the extension's install dir) via `extensions:list`; a
  small renderer-side hook (e.g. `useExtensionTheme`) reads that file through a dedicated
  `extensions:readThemeFile` IPC call (renderer has no `fs`) and calls `defineTheme` /
  `setTheme` when an extension is enabled. `MonacoWrapper`'s `theme` prop switches from
  the `"vs-dark"` literal to this hook's current theme id (default remains `vs-dark`).
- **"Not activatable" extensions**: any installed extension whose manifest lacks
  `contributes.themes` is still listed and can be enabled/disabled/uninstalled (state is
  tracked honestly), but `setEnabled(true)` on it is a no-op for the editor and the panel
  shows a "not activatable in basic mode" badge, rather than pretending activation
  happened, and rather than blocking install of non-theme extensions outright.
- **Manifest trust boundary**: `extensions:install` validates that `namespace`/`name`
  contain only `[a-zA-Z0-9_-]` (same characters OpenVSX itself allows) before using them
  to build a filesystem path, and that the extracted theme file path resolves inside the
  extension's own install directory, before ever touching disk paths derived from
  network input.

## Risks / Trade-offs

- **Zip-slip / path traversal during unzip** → mitigation: `extract-zip` resolves entries
  safely by default, but the manifest's `contributes.themes[].path` is still
  attacker-influenced; resolve it with `path.resolve` and reject if it escapes the
  extension's install directory before reading.
- **"Basic mode" undersells what a user expects from "install a plugin"** (no IntelliSense,
  no snippets, no commands) → mitigation: proposal and panel copy are explicit that only
  color themes activate; other installed extensions are visibly marked, not silently
  broken.
- **OpenVSX extension without a `contributes.themes` entry chosen for manual testing** →
  mitigation: task list picks a known theme extension (e.g. a popular `*-theme` package)
  and verifies its manifest shape via the OpenVSX API before relying on it in the E2E
  check.
- **New dependency (`extract-zip`)** → mitigation: small, no native bindings, already
  widely used by Electron-adjacent tooling (electron-builder itself depends on it
  transitively), low maintenance risk.

## Migration Plan

Additive only: new IPC channels, new adapter, new `ActivityBar` entry, new `electron-store`
namespace (`extensions`). No existing channel, entity, or stored schema changes. Rollback
is deleting the new files/entry and the `extensions` electron-store file; no data migration
needed since nothing existed to install before this change.

## Open Questions

- Should uninstall also revert an active theme to `vs-dark` immediately, or leave the
  editor on the (now-orphaned) theme until the next enable/disable action? Defaulting to
  "revert immediately" for consistency — flagged here in case product feedback disagrees.
