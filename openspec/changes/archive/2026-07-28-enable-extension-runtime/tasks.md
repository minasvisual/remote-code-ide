## 1. Dependencies

- [x] 1.1 Add `extract-zip` (and its `@types/extract-zip` if needed) to `package.json` for
      reading `.vsix` (zip) archives in the main process.

## 2. Domain port & entities

- [x] 2.1 Add `InstalledExtension` entity in `src/main/domain/entities/` (`id`,
      `namespace`, `name`, `version`, `displayName`, `enabled`, `hasBasicModeContribution`,
      `installDir`, `themeFile?`).
- [x] 2.2 Add `IExtensionService` port in `src/main/domain/ports/IExtensionService.ts`
      with `install(namespace, name, version)`, `list()`, `uninstall(id)`,
      `setEnabled(id, enabled)`, `readThemeFile(id)`.

## 3. Main-process adapter

- [x] 3.1 Create `src/main/adapters/extensions/VsixExtensionService.ts` implementing
      `IExtensionService`: validate `namespace`/`name` against `[a-zA-Z0-9_-]`, download
      the `.vsix` from OpenVSX, extract via `extract-zip` into
      `app.getPath('userData')/extensions/<namespace>.<name>-<version>/`, parse
      `extension/package.json` for the manifest.
- [x] 3.2 Persist installed-extension index via `electron-store` (`name: 'extensions'`),
      following the `ElectronStoreConnectionRepo` pattern (list/get/save/update/delete of
      the index entries; binary/theme assets stay on disk, not in the store).
- [x] 3.3 Implement `hasBasicModeContribution` detection: manifest has a non-empty
      `contributes.themes` array.
- [x] 3.4 Implement `readThemeFile(id)`: resolve the first theme's `path` against the
      extension's `installDir`, reject (return an error) if the resolved path escapes
      `installDir`, otherwise return the theme JSON's file contents.
- [x] 3.5 Implement `uninstall(id)`: remove the install directory recursively and the
      store entry; return an error (not a throw) if `id` is not installed.

## 4. IPC wiring

- [x] 4.1 Create `src/main/infrastructure/ipc/extensions.ipc.ts` with
      `registerExtensionsIpc(service: IExtensionService)` exposing `extensions:install`,
      `extensions:list`, `extensions:uninstall`, `extensions:setEnabled`,
      `extensions:readThemeFile`, each returning `{ success, data?, error? }`.
- [x] 4.2 Instantiate `VsixExtensionService` and call `registerExtensionsIpc(...)` in
      `src/main/index.ts`, alongside the other `register*Ipc` calls.

## 5. Preload & renderer port

- [x] 5.1 Add an `extensions` section to `IRemoteApi` in
      `src/renderer/domain/ports/IRemoteApi.ts` (`install`, `list`, `uninstall`,
      `setEnabled`, `readThemeFile`), with a renderer-facing `InstalledExtension` type
      mirroring the main-process entity.
- [x] 5.2 Implement the `extensions` block in `src/preload/index.ts` via
      `ipcRenderer.invoke`, unwrapping `{ success, data, error }` into resolved values or
      thrown errors, matching the existing `sftp.*` unwrap pattern.

## 6. Renderer: theme activation

- [x] 6.1 Add a small extension-theme hook/context (e.g.
      `application/hooks/useExtensionTheme.ts`) that: loads installed extensions on
      mount, tracks the currently-enabled theme extension (if any), and on enable calls
      `extensions.readThemeFile`, registers the theme via `monaco.editor.defineTheme`,
      and exposes the active theme id (defaulting to `'vs-dark'`).
- [x] 6.2 Update `MonacoWrapper.tsx` so the `Editor`'s `theme` prop reads from this hook
      instead of the hardcoded `"vs-dark"` literal.
- [x] 6.3 On disable/uninstall of the currently-active theme extension, revert the active
      theme id to `'vs-dark'` immediately.

## 7. Renderer: ExtensionsPanel & ActivityBar

- [x] 7.1 Add an `'extensions'` entry to `ActivityBar.tsx`'s `topItems` so
      `sidebarView` can be set to `'extensions'` from the UI.
- [x] 7.2 Replace `ExtensionsPanel`'s stub `install()` (raw `fetch` + "restart to apply"
      notify) with a call to `getRemoteApi().extensions.install(...)`, with a loading
      state and success/error notification.
- [x] 7.3 Add an "Installed" section to `ExtensionsPanel` listing installed extensions
      with an enable/disable toggle, an uninstall button, and a "not activatable in basic
      mode" badge for extensions without `hasBasicModeContribution`.
- [x] 7.4 In the search-results list, replace the install button with an "already
      installed" indicator for extensions whose id is already in the installed list.

## 8. Verification

- [x] 8.1 `npm run typecheck` passes.
- [x] 8.2 Add/adjust unit tests under
      `src/renderer/ui/components/extensions/__tests__/ExtensionsPanel.test.tsx` covering:
      install call-through, installed-list rendering, enable/disable toggle, uninstall,
      and the "not activatable" badge, using `createMockApi()` extended with an
      `extensions` mock.
- [x] 8.3 Manual end-to-end check in the running app (built `out/`, driven via a Playwright
      `_electron` script against a real OpenVSX extension — `zhuangtongfa.material-theme`
      "One Dark Pro", verified via the OpenVSX API to have `contributes.themes`): confirmed
      the Extensions icon appears in the `ActivityBar` and opens the panel; searched OpenVSX
      for real results; installed it (real download+extract, persisted to disk/electron-store);
      confirmed it appears under "Installed" and search results show "Already installed";
      enabled it with no runtime error (found and fixed two real bugs along the way — see
      below); disabled it; confirmed install survives an app restart; uninstalled it and
      confirmed it disappears from disk/store and stays gone after a further restart.
      Not verified: the literal pixel-level Monaco color change, since this app has no
      local-file editing path — `MonacoWrapper` only mounts for a tab opened over an active
      SSH session, which this sandbox has no test SSH server for.
- [x] 8.4 `npm run test:unit` passes (237/237, 28 files).
