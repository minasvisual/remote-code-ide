## Why

RemoteCodeIDE has no way to get AI code assistance today. The natural expectation — "install
a VSCode AI extension like Copilot/Continue" — is a dead end: the extension runtime added in
`enable-extension-runtime` only activates `contributes.themes` (basic mode); there is no real
extension host (`activate()`/JS execution), and building one is an explicitly out-of-scope,
multi-week effort that collides with a known Rollup deep-import problem with
`@codingame/monaco-vscode-*` packages. The pragmatic path is a first-class, native chat panel
that talks to an AI provider directly and edits the currently open files through the app's own
`EditorContext`/Monaco integration — no extension host required.

## What Changes

- Add an AI provider settings UI: the user configures their own connection (provider shape,
  base URL, API key, model name) instead of the app hardcoding one vendor. Credentials are
  encrypted at rest via the existing `SafeStorageCrypto` (OS keychain), the same way SSH
  connection credentials are handled — never stored or transmitted in plaintext, never sent to
  the renderer after save.
- Add a chat panel reachable from a new `ActivityBar` entry, alongside Explorer/Connections/
  Extensions. The user converses with the AI; the AI can read the currently open editor tabs'
  content as context and propose edits.
- Proposed edits are shown as a diff for the user to explicitly accept or reject before they're
  applied to the live Monaco model / saved over SFTP — edits are never applied silently, since
  this touches real remote files.
- Streaming responses: the provider's reply streams into the chat panel incrementally (not a
  single blocking round-trip), following the existing main→renderer push pattern used by
  `terminal:output` (`ipcMain.on` + `webContents.send`) rather than a plain `ipcMain.handle`.
- New IPC channels for provider settings CRUD and for sending/streaming chat messages, following
  the existing `domain:action` / `{ success, data?, error? }` convention.

## Capabilities

### New Capabilities
- `ai-provider-settings`: storing, editing, and securely persisting the user's AI provider
  connection (provider shape, base URL, API key, model name); testing that connection.
- `ai-chat-panel`: the chat UI itself — conversation history, sending messages with open-tab
  context, streaming assistant responses, and the diff accept/reject flow for applying proposed
  edits back into open editor tabs.

### Modified Capabilities
- (none — this is additive; no existing capability's requirements change)

## Impact

- `src/renderer/ui/components/layout/ActivityBar.tsx` — new `topItems` entry for the AI panel.
- `src/renderer/ui/components/ai/` (new) — `AiChatPanel.tsx`, `AiProviderSettings.tsx`, diff
  review UI.
- `src/renderer/domain/ports/IRemoteApi.ts`, `src/preload/index.ts` — new `ai.*` surface
  (settings CRUD + send/stream message + cancel).
- `src/renderer/application/contexts/` — new context or extension of `EditorContext` to expose
  open-tab content as AI context and to apply an accepted edit back into a tab.
- `src/main/domain/entities/AiProviderConfig.ts` (new), `src/main/domain/ports/IAiProviderRepo.ts`
  and `IAiChatService.ts` (new ports), `src/main/adapters/ai/` (new: provider-config repo backed
  by `electron-store` + `SafeStorageCrypto`, and chat adapter(s) implementing the
  request/response + streaming shape for the configured provider).
- `src/main/infrastructure/ipc/ai.ipc.ts` (new), registered in `src/main/index.ts`.
- New dependency: an HTTP/SSE-capable client for streaming provider responses if `fetch`'s
  built-in streaming body reader is insufficient (to be confirmed in design.md).
- No changes to SSH/SFTP/terminal/extension-runtime capabilities or their IPC channels.
