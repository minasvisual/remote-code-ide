import type { AiProviderType } from '../entities/AiProviderConfig'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ToolCallRequest {
  id: string
  name: string
  input: unknown
}

/**
 * Provider-agnostic turn shapes. Plain `ChatMessage`s (role `user`/`assistant` + `content`)
 * remain valid `AgentMessage`s — this is a superset used only when `tools` is non-null.
 */
export type AgentMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'assistant'; toolCalls: ToolCallRequest[] }
  | { role: 'tool'; toolCallId: string; content: string; isError: boolean }

export interface ToolDefinition {
  name: string
  description: string
  /** JSON Schema (object type) describing the tool's input. */
  inputSchema: Record<string, unknown>
}

export interface FileContext {
  path: string
  content: string
  truncated: boolean
}

/** Config resolved with a plaintext key — built from stored+decrypted data or straight from a test form. */
export interface ResolvedProviderConfig {
  providerType: AiProviderType
  baseUrl?: string
  model: string
  apiKey: string
}

export interface SendMessageOptions {
  onChunk(delta: string): void
  signal: AbortSignal
}

export type SendMessageResult =
  | { type: 'text' }
  | { type: 'tool_calls'; calls: ToolCallRequest[] }

export interface IAiChatService {
  /**
   * `tools: null` preserves today's plain-chat behavior (always resolves `{ type: 'text' }`,
   * after streaming the full reply via `onChunk`). `tools` non-null enables tool-calling —
   * a step may resolve `{ type: 'tool_calls' }` instead, with no text streamed for that step.
   */
  sendMessage(
    config: ResolvedProviderConfig,
    messages: AgentMessage[],
    fileContext: FileContext | null,
    tools: ToolDefinition[] | null,
    options: SendMessageOptions
  ): Promise<SendMessageResult>
  testConnection(config: ResolvedProviderConfig): Promise<void>
  /** Best-effort: whether this provider type is expected to support tool-calling. */
  supportsTools(): boolean
}
