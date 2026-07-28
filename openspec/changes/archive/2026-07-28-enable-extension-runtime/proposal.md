## Why

`ExtensionsPanel.tsx` can already search OpenVSX, but two things stop a user from ever
using it: (1) there is no Extensions icon in the `ActivityBar` — `sidebarView` supports
`'extensions'` but nothing ever sets it, so the panel is unreachable — and (2) `install()`
only downloads the `.vsix` and shows "restart to apply"; nothing is persisted, unpacked,
or activated. There is no extension host wired up (`@codingame/monaco-vscode-api` service
overrides are installed but intentionally not imported, per this repo's own notes about
Rollup deep-import failures). Fully solving that is a large, separate effort. This change
enables the feature end-to-end for the one contribution type that needs no extension host
at all — color themes, which are pure JSON read directly by `monaco.editor.defineTheme`
— so the "plugins" toggle stops being dead code and one real OpenVSX extension can be
installed, enabled, and verified to actually change editor behavior.

## What Changes

- Add an "Extensions" icon to `ActivityBar` so `sidebarView` can be set to `'extensions'`
  and the existing `ExtensionsPanel` becomes reachable from the UI.
- Add a main-process extension store: install persists the downloaded `.vsix` (unzipped)
  under `app.getPath('userData')/extensions/<publisher>.<name>`, reads its `package.json`
  manifest, and records installed state (version, enabled flag) via `electron-store`.
- Add IPC channels `extensions:install | list | uninstall | setEnabled` following the
  existing `domain:action` / `{ success, data?, error? }` pattern.
- Replace `ExtensionsPanel`'s stub `install()` with a real call through `getRemoteApi()`;
  show installed extensions (separate from search results) with enable/disable toggles
  and an uninstall action.
- **Basic mode scope**: only extensions whose manifest declares `contributes.themes` are
  supported for activation. On enable, the extension's theme JSON is loaded and registered
  with `monaco.editor.defineTheme`, and the editor switches to it. Extensions without a
  supported contribution can still be installed/listed but are marked "not activatable in
  basic mode" rather than silently doing nothing.
- Not in scope: full VSCode extension host, JS-activated extensions (`activate()` entry
  points), language servers, commands/keybindings contributed by extensions.

## Capabilities

### New Capabilities
- `extension-runtime`: main-process storage/lifecycle for installed extensions (install,
  list, uninstall, enable/disable) and renderer-side activation of basic-mode (color
  theme) contributions against the Monaco editor.

### Modified Capabilities
- `extensions-panel`: search/install flow changes from a download-only stub to a real
  install backed by `extension-runtime`; adds an ActivityBar entry making the panel
  reachable; adds an installed-extensions list with enable/disable/uninstall controls.

## Impact

- `src/renderer/ui/components/layout/ActivityBar.tsx` — new `topItems` entry.
- `src/renderer/ui/components/extensions/ExtensionsPanel.tsx` — real install/list/toggle
  wired through `getRemoteApi()` instead of a raw `fetch` + stub notify.
- `src/renderer/domain/ports/IRemoteApi.ts`, `src/preload/index.ts` — new `extensions.*`
  surface.
- `src/main/domain/ports/IExtensionService.ts` (new port), `src/main/adapters/extensions/`
  (new adapter: VSIX download+unzip, manifest parsing, electron-store-backed state),
  `src/main/infrastructure/ipc/extensions.ipc.ts` (new), registered in `src/main/index.ts`.
- `src/renderer/ui/components/editor/MonacoWrapper.tsx` — theme is no longer hardcoded to
  `"vs-dark"`; reads the active theme from a small extension-runtime context/hook.
- New dependency: a VSIX (zip) extraction library for the main process (e.g. `extract-zip`
  or `yauzl`) — `archiver` (already a dependency) only writes zips, it does not read them.
- No changes to SSH/SFTP/terminal capabilities or IPC channels.
