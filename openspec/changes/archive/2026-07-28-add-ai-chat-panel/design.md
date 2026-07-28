## Context

RemoteCodeIDE edits real files on remote servers over SFTP through `EditorContext` (open tabs,
dirty tracking, `saveActiveFile`) and renders them in Monaco via `MonacoWrapper` (the only file
allowed to import `@monaco-editor/react`). Credentials for SSH connections are encrypted at rest
via `SafeStorageCrypto` (`electron.safeStorage`) and never leave the main process in plaintext;
`ElectronStoreConnectionRepo` is the reference pattern for persisting a list of user-entered
connection profiles. IPC follows a strict `domain:action` naming convention, with two shapes in
use: blocking `ipcMain.handle` returning `{ success, data?, error? }` (see `connections.ipc.ts`,
`extensions.ipc.ts`), and a push-progress shape for long-running/streamed operations — the caller
gets an id back immediately (`{ transferId }` / `{ searchId }`), progress arrives via
`webContents.send` events, and a `cancel*` IPC channel can abort mid-flight (see
`sftp:downloadFile`/`sftp:downloadProgress`/`sftp:cancelDownload` and
`sftp:searchInFolder`/`sftp:searchProgress`/`sftp:cancelSearch` in `sftp.ipc.ts`). This change
reuses both existing shapes rather than inventing a third.

There is intentionally no VSCode extension host in this app (see `enable-extension-runtime`), so
AI code assistance must be a native feature: a chat panel that calls a user-configured AI HTTP
API directly from the main process (keeping API keys out of the renderer, same trust boundary as
SSH credentials) and applies accepted edits back into the renderer's existing tab/Monaco state.

## Goals / Non-Goals

**Goals:**
- Let the user configure their own AI provider connection(s) — no vendor hardcoded — with the
  API key encrypted at rest via `SafeStorageCrypto`, mirroring the connections settings UX.
- Provide a chat panel where the user converses with the assistant, the assistant sees the
  active editor tab's content as context, and can propose a full-file edit.
- Never apply an AI-proposed edit silently: show a diff, require explicit accept, and only then
  update the in-memory tab (still going through the existing manual save flow — no auto-save).
- Stream the assistant's response incrementally into the chat panel.
- Support at least two provider request shapes so both hosted (OpenAI, Anthropic, OpenRouter)
  and local (Ollama's OpenAI-compatible endpoint) models work without per-vendor app updates.

**Non-Goals:**
- No multi-file/autonomous agent loops (the assistant edits one file per turn, the one currently
  active); no automatic multi-step tool use.
- No inline ghost-text completions (explicitly deferred; this change is chat-only).
- No VSCode-extension-based AI integration (ruled out — no extension host).
- No auto-save of accepted edits over SFTP — accepting a diff only updates the open tab's
  in-memory content and marks it dirty, same as if the user had typed the change themselves.

## Decisions

- **Two provider adapters behind one port**: `IAiChatService` has a single `sendMessage(...)`
  shape; two adapters implement it — `AnthropicChatAdapter` (Messages API: `POST
  {baseUrl ?? https://api.anthropic.com}/v1/messages`, `x-api-key` header, `anthropic-version`
  header, `stream: true`) and `OpenAiCompatibleChatAdapter` (`POST {baseUrl}/chat/completions`,
  `Authorization: Bearer <key>`, `stream: true`). The stored provider config's `providerType`
  (`'anthropic' | 'openai-compatible'`) picks the adapter at request time. Rationale: covers the
  large majority of real providers (OpenAI, Azure-OpenAI-compatible proxies, OpenRouter, Ollama,
  LM Studio all speak OpenAI-compatible; Anthropic's Messages API needs its own shape since it
  isn't OpenAI-compatible) without asking the user to hand-write request templates.
- **No new HTTP/SSE dependency**: both provider shapes stream as `text/event-stream` (`data:
  {...}\n\n` frames). Node's `fetch` (available in the main process, same as used by
  `VsixExtensionService`) exposes `response.body` as a web `ReadableStream`; a small hand-rolled
  reader (`TextDecoder` + splitting on `\n\n`) parses SSE frames without adding a dependency.
  Rejects the proposal's tentative "new HTTP/SSE client" — resolved as unnecessary.
- **Streaming IPC shape reuses the download/search pattern, not a new one**: `ai:chat:send`
  (`ipcMain.handle`) validates input and returns `{ chatId }` immediately; chunks stream via
  `webContents.send('ai:chat:chunk', { chatId, delta })`; a terminal event
  (`ai:chat:chunk` with `status: 'done' | 'error' | 'cancelled'`) ends the turn; `ai:chat:cancel`
  aborts via `AbortController`, mirroring `sftp:cancelDownload`. Rationale: this is the third
  feature in the app needing streamed-progress-over-IPC; reusing the established shape keeps the
  main process's IPC surface consistent instead of introducing a bespoke event protocol.
- **Provider config storage**: new `electron-store` namespace `name: 'ai-providers'`, holding a
  list of profiles (`id`, `label`, `providerType`, `baseUrl?`, `model`, `encryptedApiKey`, one
  flagged `isDefault`), following `ElectronStoreConnectionRepo` exactly — encryption via the same
  `SafeStorageCrypto` instance already constructed in `main/index.ts`. A list (not a single
  config) because the user may want more than one model/provider (e.g. a cheap local model and a
  hosted one) and switch between them, matching the existing connections list UX.
- **Context sent to the model**: only the currently active tab's `remotePath` + `content` (size-
  capped, reusing the existing 5 MB SFTP warning threshold as the cap — content above that is
  truncated with a visible notice in the chat) plus the conversation history. No multi-file
  `@mention` context in v1 — flagged as a non-goal above, revisit if requested.
- **Edit proposal format**: the system prompt instructs the model that, when proposing a file
  edit, it must emit the complete new file content in a single fenced code block labeled with the
  file's path (` ```path/to/file.ts\n<full content>\n``` `). The main process (or renderer, see
  open question) extracts that block once streaming completes. Rationale: works identically
  across both provider shapes without needing per-vendor structured tool-calling schemas, keeping
  v1 provider-agnostic; trades off the robustness of true structured output, acceptable for a v1
  chat-only assistant.
- **Diff review UI**: reuse Monaco's built-in diff editor (`monaco.editor.createDiffEditor`,
  already bundled — no new dependency) in a modal, showing the active tab's current content on
  the left and the proposed content on the right, with Accept/Reject actions. On accept,
  `EditorContext.updateContent(tabId, newContent)` is called (existing method) — the tab becomes
  dirty and follows the normal save path; nothing is written over SFTP automatically.
- **New `ActivityBar` entry** ("AI Chat"), following the same `topItems` pattern used for
  Explorer/Connections/Extensions, panel rendered in the sidebar switch in `App.tsx`.

## Risks / Trade-offs

- **Fenced-code-block parsing is fragile** if the model doesn't follow the instructed format
  exactly → mitigation: system prompt is explicit and includes a one-shot example; if no
  matching fenced block is found in the completed response, the panel just shows the plain reply
  with no diff/accept action (degrades to a normal chat message, never crashes).
- **User-supplied `baseUrl` is an arbitrary URL** (SSRF-shaped risk) → mitigation: this runs
  entirely with the user's own machine and their own credentials/intent, the same trust level
  already accepted for OpenVSX downloads and SSH host/port entry; only enforce `http(s):` scheme
  before ever issuing the request.
- **Sending file content to a third-party API is inherent to the feature** → mitigation: this is
  the user's explicit choice of provider/key; the chat panel should show which file/how much
  content is being sent before the first message of a session, so it's never a silent surprise.
- **Large responses / slow providers** could leave a chat turn streaming indefinitely →
  mitigation: `ai:chat:cancel` (same `AbortController` pattern as file downloads) plus a
  reasonable client-side timeout on the initial connect (not the full stream, since long
  completions are expected).
- **Two adapters means two sets of provider quirks to maintain** → mitigation: scope v1 to
  exactly these two shapes (covers the overwhelming majority of real providers per the Decisions
  above); do not add a third shape without a concrete need.

## Migration Plan

Additive only: new `electron-store` namespace (`ai-providers`), new IPC channels, new
`ActivityBar` entry, new renderer components. No existing channel, entity, store schema, or
capability changes. Rollback is deleting the new files/entry and the `ai-providers`
electron-store file; no data migration needed since nothing existed before this change.

## Open Questions

- Should fenced-code-block extraction happen in the main process (before the chunk ever reaches
  the renderer) or in the renderer once streaming completes? Leaning renderer-side (simpler: main
  process stays a dumb relay of raw text chunks, consistent with how `terminal:output` doesn't
  interpret its payload either) — flagged here in case implementation reveals a reason to move it.
- Exact retry/backoff policy on transient provider HTTP errors (e.g. 429/5xx) is left to
  implementation; v1 can start with "surface the error, let the user resend" and add retries
  later if needed.
- Whether accepted edits should also offer an immediate "Accept & Save" shortcut (skipping the
  normal manual save step) is left open — default behavior (accept updates the tab, user still
  saves manually) is the safer starting point.
