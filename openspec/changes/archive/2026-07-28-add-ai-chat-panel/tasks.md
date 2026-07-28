## 1. Domain entities & ports (main)

- [x] 1.1 Add `AiProviderConfig` entity in `src/main/domain/entities/` (`id`, `label`,
      `providerType: 'anthropic' | 'openai-compatible'`, `baseUrl?`, `model`,
      `encryptedApiKey`, `isDefault`).
- [x] 1.2 Add `IAiProviderRepo` port in `src/main/domain/ports/IAiProviderRepo.ts` with
      `list()`, `get(id)`, `save(config)`, `update(config)`, `delete(id)`, `setDefault(id)`,
      mirroring `IConnectionRepo`.
- [x] 1.3 Add `IAiChatService` port in `src/main/domain/ports/IAiChatService.ts` with
      `sendMessage(config, messages, fileContext, options)` where `options` carries
      `onChunk(delta)`, `signal` (for cancellation), and returns a promise that resolves when
      the turn completes; and `testConnection(config)`.

## 2. Main-process adapters

- [x] 2.1 Create `src/main/adapters/ai/ElectronStoreAiProviderRepo.ts` implementing
      `IAiProviderRepo` via `electron-store` (`name: 'ai-providers'`) +
      `SafeStorageCrypto`, following `ElectronStoreConnectionRepo`'s pattern exactly
      (encrypt on save/update, never return the key or its encrypted form from `list`/`get`).
- [x] 2.2 Create `src/main/adapters/ai/sseParser.ts`: a small hand-rolled parser that reads a
      `Response.body` `ReadableStream`, decodes with `TextDecoder`, splits on blank-line-
      delimited `data: {...}` frames, and yields parsed JSON frames (no new dependency).
- [x] 2.3 Create `src/main/adapters/ai/AnthropicChatAdapter.ts` implementing `IAiChatService`:
      `POST {baseUrl ?? https://api.anthropic.com}/v1/messages` with `x-api-key`,
      `anthropic-version`, `stream: true`; feed each SSE frame's text delta to `onChunk`;
      abort via `signal`.
- [x] 2.4 Create `src/main/adapters/ai/OpenAiCompatibleChatAdapter.ts` implementing
      `IAiChatService`: `POST {baseUrl}/chat/completions` with `Authorization: Bearer <key>`,
      `stream: true`; feed each SSE frame's delta to `onChunk`; abort via `signal`.
- [x] 2.5 Create `src/main/adapters/ai/AiChatServiceFactory.ts` (or equivalent dispatch): picks
      `AnthropicChatAdapter` vs `OpenAiCompatibleChatAdapter` by `config.providerType`.
- [x] 2.6 Implement `testConnection(config)` on both adapters: a minimal non-streaming request
      (e.g. a 1-token completion) that resolves on 2xx and throws a descriptive error otherwise
      (invalid key, unreachable host, unknown model).

## 3. IPC wiring

- [x] 3.1 Create `src/main/infrastructure/ipc/ai.ipc.ts` with `registerAiIpc(repo, chatFactory)`
      exposing `ai:providers:list | save | update | delete | setDefault | test`
      (`ipcMain.handle`, `{ success, data?, error? }`), following `connections.ipc.ts`.
- [x] 3.2 In the same file, add `ai:chat:send` (`ipcMain.handle`): validates a provider is
      configured, generates a `chatId`, kicks off `chatService.sendMessage(...)` with an
      `AbortController`, returns `{ chatId }` immediately (mirroring
      `sftp:downloadFile`/`sftp:searchInFolder`), and streams `ai:chat:chunk` events
      (`{ chatId, delta, status: 'streaming' | 'done' | 'error' | 'cancelled', error? }`) via
      `webContents.send`.
- [x] 3.3 Add `ai:chat:cancel` (`ipcMain.handle`) that aborts the matching `AbortController`,
      mirroring `sftp:cancelDownload`/`sftp:cancelSearch`.
- [x] 3.4 Instantiate `ElectronStoreAiProviderRepo` + `AiChatServiceFactory` and call
      `registerAiIpc(...)` in `src/main/index.ts`, alongside the other `register*Ipc` calls.

## 4. Preload & renderer port

- [x] 4.1 Add an `ai` section to `IRemoteApi` in `src/renderer/domain/ports/IRemoteApi.ts`:
      `providers.list/save/update/delete/setDefault/test`, `chat.send(messages, fileContext)`
      returning `{ chatId }`, `chat.onChunk(cb)` returning an unsubscribe function, and
      `chat.cancel(chatId)`; add a renderer-facing `AiProviderConfig` type (without the API key
      field) and `AiChatChunkEvent` type mirroring the main-process shapes.
- [x] 4.2 Implement the `ai` block in `src/preload/index.ts` via `ipcRenderer.invoke`/`.on`,
      unwrapping `{ success, data, error }`, matching the existing `sftp.*` pattern for the
      `providers.*` calls and the `onDownloadProgress` pattern for `chat.onChunk`.

## 5. Renderer: AI provider settings UI

- [x] 5.1 Create `src/renderer/ui/components/ai/AiProviderSettings.tsx`: list of configured
      providers (label, type, model), create/edit form (provider type select, base URL, model,
      API key input — write-only, never pre-filled on edit), delete action, "set as default"
      action, and a "Test connection" button, following `ConnectionManager`/`ConnectionForm`
      conventions.
- [x] 5.2 Surface `AiProviderSettings` from within the AI chat panel (a gear/settings toggle
      inside `AiChatPanel`, not a separate `ActivityBar` entry) so provider setup and the chat
      itself live in one reachable place.

## 6. Renderer: AI chat state & context

- [x] 6.1 Create `src/renderer/application/contexts/AiChatContext.tsx`: in-memory (session-
      only, cleared on app restart — no persistence) message history, `sendMessage(text)`,
      `cancel()`, streaming/loading state, and the list of configured providers (via
      `getRemoteApi().ai.providers.list()`).
- [x] 6.2 Wire `AiChatProvider` into `src/renderer/App.tsx`'s provider tree alongside
      `AppProvider`/`EditorProvider`/`ExtensionThemeProvider`.
- [x] 6.3 In `sendMessage`, read the active tab from `EditorContext` (path + content) as file
      context; if content exceeds 5 MB, truncate and flag it in the sent context and show a
      visible notice in the chat; if no tab is open, send no file context.

## 7. Renderer: chat panel UI + diff review

- [x] 7.1 Add an `'ai-chat'` entry to `ActivityBar.tsx`'s `topItems` so `sidebarView` can be set
      to `'ai-chat'` from the UI, and wire it into the sidebar switch in `App.tsx`.
- [x] 7.2 Create `src/renderer/ui/components/ai/AiChatPanel.tsx`: message list (user/assistant),
      input box, send button, streaming text rendering as chunks arrive, a "Cancel" button
      while a turn is in flight, and an empty/guidance state when no provider is configured
      (linking into `AiProviderSettings`).
- [x] 7.3 On a completed assistant message, parse a fenced code block labeled with a file path
      (` ```path/to/file\n...\n``` `) and check whether that path matches a currently open tab;
      if the response has no such block or no match, render it as plain text with no diff
      action.
- [x] 7.4 Create a diff review modal using Monaco's built-in diff editor
      (`monaco.editor.createDiffEditor`) showing the matched tab's current content vs. the
      proposed content, with "Accept" and "Reject" actions.
- [x] 7.5 On "Accept", call `EditorContext.updateContent(tabId, newContent)` (tab becomes dirty,
      no automatic SFTP save). On "Reject", discard the proposal and keep the tab unchanged.

## 8. Verification

- [x] 8.1 `npm run typecheck` passes.
- [x] 8.2 Add unit tests under `src/renderer/ui/components/ai/__tests__/` covering:
      `AiProviderSettings` (create/edit/delete/set-default/test-connection call-through) and
      `AiChatPanel` (send with active-tab context, streaming chunk rendering, cancel,
      diff-block parsing + accept/reject, no-provider empty state), using `createMockApi()`
      extended with an `ai` mock.
- [x] 8.3 Manual end-to-end check in the running app (`npm run dev`): configure a real (or
      locally-hosted OpenAI-compatible) provider; confirm the AI Chat icon opens the panel;
      send a message with a file open and confirm the response streams in; ask the assistant to
      propose an edit to that file and confirm a diff appears; accept it and confirm the tab
      becomes dirty with the new content; reject a different proposal and confirm the tab is
      unchanged; cancel an in-flight response and confirm it stops cleanly.
- [x] 8.4 `npm run test:unit` passes.
