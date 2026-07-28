## 1. Non-interactive remote command execution

- [x] 1.1 Add `execCommand(sessionId, command, options: { timeoutMs?: number })` to
      `src/main/domain/ports/ISshClient.ts`, returning `Promise<{ stdout: string; stderr: string; exitCode: number }>`.
- [x] 1.2 Implement `execCommand` in `src/main/adapters/ssh/Ssh2Client.ts` via `ssh2`'s
      non-PTY `exec()` channel (distinct from the interactive shell used by `terminal:*`).
      Enforce a default 30s timeout (killing the channel and rejecting with a timeout error
      on expiry) and cap captured stdout/stderr (default 64 KB each, truncated with a marker).

## 2. Domain entities & ports for tool-calling

- [x] 2.1 Extend `src/main/domain/ports/IAiChatService.ts`: add `ToolDefinition`
      (`name`, `description`, `inputSchema`), `ToolCallRequest` (`id`, `name`, `input`), and
      widen `ChatMessage` into an `AgentMessage` union (plain turn / assistant tool-calls /
      tool result). Change `sendMessage`'s return type to
      `Promise<{ type: 'text' } | { type: 'tool_calls'; calls: ToolCallRequest[] }>` and add an
      optional `tools: ToolDefinition[] | null` parameter — `null` preserves today's
      always-`{ type: 'text' }` behavior for existing callers.
- [x] 2.2 Add `src/main/domain/entities/AgentTool.ts` (or extend `IAiChatService.ts`) with a
      `ToolResult` shape (`content: string`, `isError: boolean`) returned by tool execution.

## 3. Tool implementations

- [x] 3.1 Create `src/main/adapters/ai/tools/listDirectoryTool.ts`: wraps
      `ISftpService.listDir`, read-only, no approval required.
- [x] 3.2 Create `src/main/adapters/ai/tools/readFileTool.ts`: wraps `ISftpService.readFile`
      (reusing the existing 5 MB cap/truncation convention from `sftp:readFile`), read-only,
      no approval required.
- [x] 3.3 Create `src/main/adapters/ai/tools/writeFileTool.ts`: does **not** write directly —
      resolves to a pending-diff descriptor (`path`, `proposedContent`) for the approval/diff
      flow in section 6; mutating, requires approval unless auto-approved.
      **Design refinement made during implementation** (see note below): `write_file`'s
      "execute" only *prepares* the diff (a non-mutating remote read) and always runs
      immediately/ungated; the actual write is committed client-side by the existing diff
      modal (tab update or direct SFTP write), and `approveTool`/`denyTool` for this tool means
      "the renderer already applied/discarded it," not "please execute now." This differs from
      `run_command`, where approval triggers the main process to actually execute the command.
      Necessary because only the renderer has the in-memory open-tab state the existing
      diff/accept flow depends on — see section 5/6 for the full mechanics.
- [x] 3.4 Create `src/main/adapters/ai/tools/runCommandTool.ts`: wraps the new
      `ISshClient.execCommand`, returns `{ stdout, stderr, exitCode }` as the tool result;
      mutating, requires approval unless auto-approved.
- [x] 3.5 Create `src/main/adapters/ai/tools/registry.ts`: a single array of
      `{ definition, mutating, execute }` entries for all four tools — the source of truth for
      both the provider-agnostic tool list and the dispatch table used once a call is approved.

## 4. Provider adapters: tool-calling support

- [x] 4.1 Extend `AnthropicChatAdapter.sendMessage`: when `tools` is non-null, include them as
      top-level `tools` in the request; accumulate streamed `content_block_start`/
      `content_block_delta` (`input_json_delta`)/`content_block_stop` frames per content block,
      and resolve with `{ type: 'tool_calls', calls }` if any `tool_use` blocks were produced,
      else `{ type: 'text' }`. Translate `AgentMessage` history (assistant tool-calls, tool
      results) to Anthropic's `tool_use`/`tool_result` content-block shape.
- [x] 4.2 Extend `OpenAiCompatibleChatAdapter.sendMessage`: when `tools` is non-null, include
      them as `tools: [{ type: 'function', function }]`; accumulate streamed
      `choices[0].delta.tool_calls[]` fragments (keyed by `index`) into complete calls, and
      resolve with `{ type: 'tool_calls', calls }` if any were produced, else `{ type: 'text' }`.
      Translate `AgentMessage` history to `tool_calls`/`role: 'tool'` messages.
- [x] 4.3 Add `supportsTools()` to `IAiChatService`/both adapters as a synchronous best-effort
      check (Anthropic: always `true`; OpenAI-compatible: optimistic `true` default, since it
      can't be statically verified without a real request — a genuinely unsupported endpoint
      will surface a clear API error on first use instead of being silently blocked). Deeper
      per-request detection was explicitly deferred in design.md as a non-blocking open
      question.

## 5. Agent loop orchestration & IPC

- [x] 5.1 In `src/main/infrastructure/ipc/ai.ipc.ts`, extend `ai:chat:send`'s payload with an
      `agentOptions: { sessionId, autoApproveThisTurn } | null` parameter (non-null = agent
      mode). When set, run a new `runAgentTurn` loop instead of a single `sendMessage` call:
      repeatedly call `chatService.sendMessage(config, history, fileContext, tools, options)`;
      on `{ type: 'text' }` the turn ends; on `{ type: 'tool_calls' }`, execute each call in
      sequence (see 5.2), append `{ role: 'assistant', toolCalls }` and each tool's
      `{ role: 'tool', ... }` result to `history`, and loop. Cap iterations at 15 steps, ending
      with `status: 'step_limit'` if reached. Also added `ai:providers:supportsTools`
      (not in the original task list) so the renderer can gate the Agent-mode toggle per 9.1.
- [x] 5.2 For each tool call: read-only tools execute immediately, no gating. `run_command`
      (mutating): if not auto-approved, emit `ai:chat:toolCallPending` and await the resolved
      decision before executing via the registry; if auto-approved, execute immediately and
      report with `autoApproved: true` (no pending event — "no pause" per spec). `write_file`
      is handled distinctly (see 3.3's note): it always prepares the diff preview and always
      emits `toolCallPending`/awaits the renderer's decision regardless of auto-approve, since
      only the renderer (which holds open-tab state) performs the actual commit — auto-approve
      only changes whether the renderer prompts the user or self-resolves the diff.
- [x] 5.3 Add `ai:chat:approveTool` / `ai:chat:denyTool` (`ipcMain.handle`, keyed by `callId`)
      that resolve the parked promise from 5.2 with an approve/deny decision.
- [x] 5.4 `ai:chat:cancel` (existing) aborts the turn's `AbortController`; a pending approval
      wait races against that same signal and rejects as `AbortError` if it fires first,
      discarding the pending call without executing and ending the turn as `cancelled`. A
      step's `for` loop also checks `signal.aborted` before starting the model call or each
      subsequent tool call so no new call begins once cancelled.
- [x] 5.5 Wire the new `execCommand`-backed `Ssh2Client` method and the tool registry into
      `src/main/index.ts` (pass `sshClient`/`sftpService` into `registerAiIpc`, alongside the
      existing repo/factory arguments).

## 6. Diff review: unopened-file support

- [x] 6.1 `DiffReviewModal.tsx` itself needed **no changes** — it already takes plain
      `{ path, original, proposed }` strings, so it's reused as-is. The "extension" is in
      `AiChatPanel`'s orchestration: main already fetches current remote content for
      `write_file` (via `ToolRegistry.prepareWriteFileDiff`, section 3.3/5.2) and sends it as
      the pending event's `input`; the panel renders the modal directly from that payload
      instead of requiring a `parseFileEdit` match against an open tab.
- [x] 6.2 Implemented in `AiChatPanel.commitAgentWrite`: on Accept, if a tab matches the
      path it calls `EditorContext.updateContent` (dirty, no auto-save, same as today); if no
      tab matches, it calls `api.sftp.writeFile(activeSession.sessionId, path, content)`
      directly. On Reject, neither runs. Either way it then calls `approveTool`/`denyTool` so
      the main-process loop's parked promise resolves and the turn continues.

## 7. Preload & renderer port

- [x] 7.1 Add the new fields/types to `IRemoteApi` in
      `src/renderer/domain/ports/IRemoteApi.ts`: `chat.send(...)` gains an
      `agentOptions: AiAgentOptions | null` parameter (carries `sessionId` +
      `autoApproveThisTurn`); add `AiToolCallPendingEvent`, `AiToolCallResultEvent`,
      `AiWriteFileDiffPreview` types; add `chat.onToolCallPending(cb)`,
      `chat.onToolCallResult(cb)`, `chat.approveTool(callId)`, `chat.denyTool(callId)`; add
      `providers.supportsTools()` (backs the new `ai:providers:supportsTools` channel from 5.1).
- [x] 7.2 Implement the additions in `src/preload/index.ts` following the existing
      `ipcRenderer.invoke`/`.on` conventions used for `chat.send`/`chat.onChunk`.

## 8. Renderer: agent chat state

- [x] 8.1 Extend `AiChatContext.tsx`: add `agentMode` (sticky until the user toggles it off —
      "per-message" in the proposal means evaluated fresh per send, not auto-reset) and
      `autoApproveThisTurn` (reset to `false` immediately when a send starts, so it never
      carries over to the next message) state; add `agentModeAvailable` (active session +
      `providers.supportsTools()`); extend `ChatUIMessage` with an optional `toolCalls` list
      (`id`, `name`, `input`, `status: 'pending' | 'done'`, `result`, `autoApproved`) for the
      trace UI.
- [x] 8.2 Subscribe to `chat.onToolCallPending`/`onToolCallResult` and merge events into the
      right message's `toolCalls` list by `callId`; add `approveTool(callId)`/
      `denyTool(callId)` methods that call the new preload API.
- [x] 8.3 Pass `{ sessionId, autoApproveThisTurn }` (or `null` outside agent mode) through
      `sendMessage`'s call to `api.ai.chat.send(...)`.

## 9. Renderer: agent mode UI

- [x] 9.1 Added an "Agent mode" checkbox and (only visible when on) an "Auto-approve this
      turn" checkbox to `AiChatPanel`'s input area; "Agent mode" is disabled with an
      explanatory label when `agentModeAvailable` is false (no active session or
      `supportsTools()` returned false).
- [x] 9.2 Each `toolCalls` entry renders as an expandable `ToolCallRow`: collapsed shows
      `🔧 <name>` (+ the raw command text inline for `run_command`) and status; expanded shows
      full JSON input/output. Pending entries (except `write_file`, whose approval is the diff
      modal itself per 3.3/6.1) show inline "Allow"/"Deny" buttons instead of a result.
- [x] 9.3 Auto-approved calls show an "auto-approved" tag in the trace row, always, whether the
      commit happened via inline execution (`run_command`) or a silently self-accepted diff
      (`write_file`).
- [x] 9.4 Added a distinct "Agent stopped after reaching the step limit" message for
      `status: 'step_limit'`. Simplified from "after N steps" — the specific step count isn't
      threaded through the chunk event; the cap is a fixed constant (`MAX_AGENT_STEPS = 15`),
      not a per-turn variable worth plumbing to the UI in v1.

## 10. Verification

- [x] 10.1 `npm run typecheck` — same as `add-ai-chat-panel`: does not cleanly pass, but the
      failures are pre-existing and confined to test files this change never touches
      (`AppContext.test.tsx`, `useKeyboardShortcuts.test.ts`, `ConnectionManager.test.tsx`,
      `DeleteConnectionModal.test.tsx`, `FileExplorer.test.tsx`, `FilePropertiesModal.test.tsx`,
      `FindInFolderModal.test.tsx`, `TreeNode.test.tsx`, `ExtensionsPanel.test.tsx` — a
      `vi.fn()`/mock-typing issue unrelated to AI/agent code). Verified zero errors under any
      `ai.ipc|adapters/ai|components/ai|AiChatContext|AiProviderConfig|IAiChatService|
      IAiProviderRepo|Ssh2Client|ISshClient` path; `tsconfig.node.json` (main/preload) typechecks
      completely clean on its own.
- [x] 10.2 Added `src/main/adapters/ai/tools/__tests__/registry.test.ts` (13 tests: tool
      definitions/mutating flags, `list_directory`/`read_file`/`run_command` dispatch and error
      handling, 5 MB read truncation, `prepareWriteFileDiff` including the "file doesn't exist
      yet" path, unknown-tool handling) and extended
      `src/renderer/ui/components/ai/__tests__/AiChatPanel.test.tsx` with an "agent mode"
      describe block (12 tests: toggle enable/disable/visibility, run_command Allow/Deny,
      auto-approved trace tag, step-limit message, and the full write_file diff flow — auto-
      shown modal, SFTP-direct vs. open-tab commit, reject, and silent auto-approved commit).
      Did not add dedicated `runAgentTurn`/streamed-tool-call-accumulation tests (would need an
      IPC/fetch-streaming test harness this project doesn't have yet) — covered instead by the
      registry unit tests (the pieces `runAgentTurn` composes) and the renderer-side approve/
      deny/trace tests; flagged here rather than silently skipped.
- [x] 10.3 Manual end-to-end check in the running app (`npm run dev`) against a real SSH
      session and a tool-calling-capable provider: ask the agent to inspect a directory, read
      a file, propose an edit to an unopened file (confirm diff + accept/reject), run a
      read-only command with and without auto-approve, and confirm the step limit and
      cancel-mid-loop behavior.
- [x] 10.4 `npm run test:unit` passes — 282/282.
