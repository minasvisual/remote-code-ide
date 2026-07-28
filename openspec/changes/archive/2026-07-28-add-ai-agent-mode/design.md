## Context

Today's chat turn (`add-ai-chat-panel`) is a single request/response: `ai:chat:send(messages, fileContext)` sends the active tab's content plus history to the default provider, streams text back, and — if the reply contains a labeled fenced code block — offers one diff to accept/reject. `ai.ipc.ts` has no notion of an SSH session, and `IAiChatService` only ever talks to the AI provider's HTTP API; it never touches `ISftpService` or `ISshClient`. Those two ports already exist and already do everything a "read/list/write files, run a command" agent would need on the SFTP side; the one capability that's genuinely missing is a bounded, non-interactive way to run a shell command and get its result back, since the existing `terminal:*` IPC is built around an interactive PTY stream for xterm.js, not a call/response.

This is a remote IDE: the files and shell being touched belong to a real server the user is SSH'd into, not a local sandbox. That constraint drives most of the decisions below.

## Goals / Non-Goals

**Goals:**
- Opt-in, per-message "Agent mode" that lets the assistant run a bounded loop of tool calls (`list_directory`, `read_file`, `write_file`, `run_command`) instead of a single text turn.
- Mutating tools (`write_file`, `run_command`) require explicit per-call approval by default; an explicit, per-turn "Auto-approve this turn" opt-in exists for users who accept the risk.
- The loop is bounded (hard step cap) and cancellable mid-flight via the existing `ai:chat:cancel` mechanism.
- Tool calls and their results are visible in the chat transcript as an expandable trace.
- Works across both existing provider adapters (Anthropic, OpenAI-compatible) behind the same `IAiChatService` port.

**Non-Goals:**
- No persistent/global "always auto-approve" setting — the opt-in is captured once per turn and never remembered.
- No new tools beyond the four listed (no `delete_file`, no arbitrary network access tool).
- No cross-session orchestration — the agent only acts against the single SSH session already active in the app.
- No parallel/concurrent tool execution in v1 — one call at a time, sequential, to keep the approval UX and file-ordering simple.
- No backgrounding of long-running commands (e.g. `nohup`-style detach-and-poll) — a command either finishes inside its timeout or is reported as a timeout error.

## Decisions

- **`run_command` is backed by a new non-interactive exec, not the visible Terminal panel.** Add `execCommand(sessionId, command, options): Promise<{ stdout: string; stderr: string; exitCode: number }>` to `ISshClient` (implemented via `ssh2`'s `exec()` channel, distinct from the PTY-based shell `terminal:*` already uses for xterm.js). Rationale: the interactive terminal is a live, user-facing byte stream — scraping its output for a bounded tool call would be fragile (ANSI parsing, no reliable exit code, and it would interleave the agent's commands with whatever the user is typing). Trade-off: agent commands do **not** appear "typed" in the user's visible terminal — only in the chat's tool-call trace. A per-command timeout (default 30s) and an output cap (default 64 KB, truncated with a notice) apply, mirroring the existing 5 MB file-context cap's rationale.

- **The tool loop is orchestrated in `ai.ipc.ts`, not inside the provider adapters.** A new `runAgentTurn` routine repeatedly calls `chatService.sendMessage(config, messages, fileContext, tools, options)`, which now resolves to a discriminated result: `{ type: 'text' }` (plain reply already streamed via `onChunk` — turn ends) or `{ type: 'tool_calls', calls: ToolCallRequest[] }` (model wants to act — loop continues). Non-agent-mode callers pass `tools: null` and always get `{ type: 'text' }`, so this is additive to the existing signature, not a breaking change to today's chat flow.

- **Provider-agnostic message/tool shapes, translated per adapter — same pattern already used for plain chat.** `ChatMessage` grows into an `AgentMessage` union: plain `{ role: 'user' | 'assistant', content }` turns as today, plus `{ role: 'assistant', toolCalls: ToolCallRequest[] }` for a step where the model called tools, plus `{ role: 'tool', toolCallId, content }` for a tool's result. Each adapter is responsible for translating this union to its own wire format exactly as it already translates plain messages: `AnthropicChatAdapter` maps it to `tool_use`/`tool_result` content blocks (Messages API), `OpenAiCompatibleChatAdapter` maps it to `tool_calls`/`role: 'tool'` (function-calling). No new cross-cutting abstraction — this is the same per-adapter-translation pattern the chat feature already established.

- **Approval flow reuses the existing cancel/registry pattern.** Mutating tool calls (`write_file`, `run_command`) pause the loop and emit `ai:chat:toolCallPending { chatId, callId, name, input }`; the handler parks a `Promise` keyed by `callId` (a sibling map to the existing `activeChats: Map<chatId, AbortController>`) until the renderer calls `ai:chat:approveTool`/`ai:chat:denyTool(callId)`. Read-only calls (`list_directory`, `read_file`) execute immediately — they can't mutate anything, so gating them would just add friction. If the turn's "Auto-approve this turn" flag was set when `ai:chat:send` was invoked, mutating calls skip the pause and execute immediately too, but the trace still visibly marks them `auto-approved` (never silently indistinguishable from a manually-approved call).

- **`write_file` doesn't write directly — it feeds the existing diff-review modal.** The tool's "execution" produces a pending-diff descriptor (path + proposed content), not an immediate SFTP write; approving it opens the same `DiffReviewModal` used for the single-file chat flow today. The modal gains one extension: if the target path has no matching open tab (the agent can touch files the user hasn't opened), it fetches the current remote content on demand via `ISftpService.readFile` for the diff's left side; on Accept, if a tab is open it updates that tab's in-memory content exactly as today, otherwise it writes straight to SFTP (there's no tab to mark dirty). `run_command` has no equivalent preview — its Allow/Deny action *is* the approval, since a shell command has no "diff" to show beforehand.

- **Hard iteration cap, not a user-tunable setting in v1.** Default 15 steps. Hitting the cap ends the turn with a distinct terminal status (e.g. `status: 'step_limit'`) rendered as "Agent stopped after 15 steps" rather than silently truncating or erroring.

- **Tool implementations are small, individually registered modules.** `src/main/adapters/ai/tools/` gets one file per tool, each exporting `{ definition: ToolDefinition, execute(sessionId, input, ctx): Promise<ToolResult> }`. A small registry array is the single source of truth for both (a) the provider-agnostic tool list passed into `sendMessage`, and (b) the dispatch table `ai.ipc.ts` uses once a call is approved. This keeps adding a tool later to a single new file plus one registry entry.

## Risks / Trade-offs

- **A model-chosen `run_command` can be destructive on a real server** (`rm -rf`, `git reset --hard`, …) → Mitigation: approval required by default; the tool's description explicitly tells the model it's operating on a live remote server; the command, its exit code, stdout and stderr are always shown before the next step, even when auto-approved, so nothing executes invisibly.
- **Hanging commands would block the loop indefinitely** → Mitigation: per-command timeout (default 30s) surfaced as a tool error the model can see and react to; backgrounding is explicitly out of scope for v1.
- **Runaway loops burn tokens/time without converging** → Mitigation: hard step cap; cancellable at any point via the existing `ai:chat:cancel`.
- **Not every configured provider/model supports tool-calling** (e.g. some locally-hosted OpenAI-compatible models) → Mitigation: extend the existing `testConnection` to report tool-support where the API surface allows detecting it; the Agent-mode toggle is disabled with an explanatory tooltip when the active default provider doesn't support tools. Exact detection heuristic is an implementation detail.
- **`write_file` breaks the "always a currently-open tab" assumption the diff modal was built on** → Mitigation: modal extended to fetch remote content on demand for files with no open tab (see Decisions); write path branches on whether a tab exists.
- **Tool results (a directory listing, a file's content) re-enter the model's context on every subsequent step, growing request size** → Mitigation: cap individual tool results (same order of magnitude as the existing file-context/command-output caps) and truncate with a visible notice.

## Migration Plan

Additive only: new tool modules, new IPC channels/events, a new `ISshClient.execCommand` method, and an extended (not replaced) `IAiChatService.sendMessage` signature — existing plain-chat call sites keep working unchanged by passing `tools: null`. Rollback is deleting the new files/channels/method and reverting the `sendMessage`/`ChatMessage` signature; no data migration, since agent-mode state is turn-scoped and never persisted.

## Open Questions

- Whether `run_command` output should also mirror into the visible Terminal panel for awareness, or stay chat-only — leaning chat-only for v1 to avoid interleaving with whatever the user is doing in their own terminal; revisit if requested.
- Exact JSON Schema subset required for `inputSchema` across both providers — implementation detail, not blocking.
- Whether a `delete_file` tool is worth adding given `ISftpService.delete` already exists — deliberately left out of v1 scope; revisit if requested.
