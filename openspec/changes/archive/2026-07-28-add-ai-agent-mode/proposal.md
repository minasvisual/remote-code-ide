## Why

The AI chat panel (`add-ai-chat-panel`) only ever sees the active editor tab and proposes a single-file edit per turn — the user drives every step. For tasks like "fix the failing tests" or "refactor this module and update its callers," a single-file chat turn isn't enough: the assistant needs to look at more than one file, run commands to check its own work, and iterate without the user re-typing a prompt after every step. This proposes an opt-in "Agent" mode that lets the assistant plan and execute a bounded sequence of actions (read/list/write files, run terminal commands) instead of a single request/response turn.

## What Changes

- Add a per-message "Agent mode" toggle in the existing `AiChatPanel` (off by default). When on, the assistant's turn becomes a tool-use loop instead of a single streamed reply: the model can call tools, see their results, and call more tools, up to a bounded number of steps, before producing its final reply.
- Add four tools the model can call, each backed by an existing capability rather than new remote-access code: `list_directory` and `read_file` (via `ISftpService`), `write_file` (via `ISftpService`, going through the same diff-review path as today — never a silent write), and `run_command` (via the existing terminal session, `ISshClient`/`terminal:*`).
- **Approval is required by default for every tool call that changes remote state** (`write_file`, `run_command`) — each shows an inline "Allow" / "Deny" action in the chat before it executes, mirroring the existing diff accept/reject flow. Read-only tools (`list_directory`, `read_file`) run without approval since they can't mutate anything.
- Add an explicit, opt-in "Auto-approve this turn" toggle the user can enable per agent turn (never a persistent global setting) for users who accept the risk of unattended execution against their own remote server.
- Add a per-tool-call trace in the chat transcript (tool name, arguments, truncated result), expandable, so the user can see and interrupt what the agent is doing at each step.
- Add a hard iteration cap (configurable, default e.g. 15 steps) and reuse the existing `ai:chat:cancel` mechanism so an agent turn can be stopped mid-loop like a normal streaming reply.
- Normalize tool-calling across the two existing provider adapters: `AnthropicChatAdapter` (Messages API `tool_use`/`tool_result` content blocks) and `OpenAiCompatibleChatAdapter` (`tools`/`tool_calls` function-calling), behind the same `IAiChatService` port shape used today.

## Capabilities

### New Capabilities
- `ai-agent-mode`: the tool-use loop itself — available tools, the per-call approval/auto-approve flow, the iteration cap, cancellation, and the in-chat tool-call trace UI.

### Modified Capabilities
- (none — `ai-chat-panel` and `ai-provider-settings` are not yet archived specs, so this change's UI/API additions to them are captured as part of `ai-agent-mode` rather than as a delta against an existing spec.)

## Impact

- `src/main/domain/ports/IAiChatService.ts` — extend to carry tool definitions and tool-result messages through `sendMessage`, in addition to the existing plain-text streaming shape.
- `src/main/adapters/ai/AnthropicChatAdapter.ts`, `OpenAiCompatibleChatAdapter.ts` — add per-provider tool-call request/response translation.
- `src/main/adapters/ai/tools/` (new) — tool implementations wrapping `ISftpService` (`list_directory`, `read_file`, `write_file`) and `ISshClient`/terminal session (`run_command`); no new remote-access logic, only new call sites into existing services.
- `src/main/infrastructure/ipc/ai.ipc.ts` — extend `ai:chat:send` to accept an `agentMode` flag and stream tool-call/approval events in addition to text chunks; add an `ai:chat:approveTool` / `ai:chat:denyTool` channel pair.
- `src/renderer/domain/ports/IRemoteApi.ts`, `src/preload/index.ts` — new types/methods for the above.
- `src/renderer/application/contexts/AiChatContext.tsx` — track tool-call/approval state per in-flight turn.
- `src/renderer/ui/components/ai/AiChatPanel.tsx` (extend), plus new components for the agent-mode toggle, the tool-call trace, and the approve/deny action.
- No changes to `sftp-operations` or `integrated-terminal` capabilities themselves — the agent calls their existing IPC surface, it doesn't add new SSH/SFTP behavior.
