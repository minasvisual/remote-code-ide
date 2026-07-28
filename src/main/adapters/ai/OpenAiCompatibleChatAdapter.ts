import type {
  IAiChatService,
  AgentMessage,
  FileContext,
  ResolvedProviderConfig,
  SendMessageOptions,
  SendMessageResult,
  ToolDefinition,
  ToolCallRequest
} from '../../domain/ports/IAiChatService'
import { parseSseStream } from './sseParser'
import { buildSystemPrompt } from './buildSystemPrompt'
import { assertHttpUrl } from './assertHttpUrl'

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

interface OpenAiStreamToolCallDelta {
  index: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface OpenAiStreamEvent {
  choices?: {
    delta?: { content?: string; tool_calls?: OpenAiStreamToolCallDelta[] }
  }[]
  error?: { message?: string }
}

function toOpenAiMessages(messages: AgentMessage[]): OpenAiMessage[] {
  return messages.map((m): OpenAiMessage => {
    if (m.role === 'user') return { role: 'user', content: m.content }
    if (m.role === 'assistant' && 'toolCalls' in m) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function' as const,
          function: { name: c.name, arguments: JSON.stringify(c.input) }
        }))
      }
    }
    if (m.role === 'assistant') return { role: 'assistant', content: m.content }
    return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
  })
}

function requireBaseUrl(config: ResolvedProviderConfig): string {
  if (!config.baseUrl) throw new Error('Base URL is required for OpenAI-compatible providers')
  assertHttpUrl(config.baseUrl)
  return config.baseUrl.replace(/\/$/, '')
}

async function readErrorBody(response: Response): Promise<string> {
  return response.text().catch(() => '')
}

export class OpenAiCompatibleChatAdapter implements IAiChatService {
  async sendMessage(
    config: ResolvedProviderConfig,
    messages: AgentMessage[],
    fileContext: FileContext | null,
    tools: ToolDefinition[] | null,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    const baseUrl = requireBaseUrl(config)

    const body: Record<string, unknown> = {
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: buildSystemPrompt(fileContext) },
        ...toOpenAiMessages(messages)
      ]
    }
    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.inputSchema }
      }))
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: options.signal
    })

    if (!response.ok || !response.body) {
      const text = await readErrorBody(response)
      throw new Error(`OpenAI-compatible request failed: HTTP ${response.status}${text ? ` — ${text}` : ''}`)
    }

    interface PendingToolCall {
      id: string
      name: string
      argsBuffer: string
    }
    const pendingCalls = new Map<number, PendingToolCall>()

    for await (const frame of parseSseStream(response.body)) {
      const event = frame as OpenAiStreamEvent
      const delta = event.choices?.[0]?.delta

      if (delta?.content) options.onChunk(delta.content)

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          let entry = pendingCalls.get(tc.index)
          if (!entry) {
            entry = { id: tc.id ?? '', name: tc.function?.name ?? '', argsBuffer: '' }
            pendingCalls.set(tc.index, entry)
          }
          if (tc.id) entry.id = tc.id
          if (tc.function?.name) entry.name = tc.function.name
          if (tc.function?.arguments) entry.argsBuffer += tc.function.arguments
        }
      }

      if (event.error) throw new Error(event.error.message ?? 'OpenAI-compatible streaming error')
    }

    const calls: ToolCallRequest[] = [...pendingCalls.values()].map((c) => {
      let input: unknown = {}
      try {
        input = c.argsBuffer ? JSON.parse(c.argsBuffer) : {}
      } catch {
        input = {}
      }
      return { id: c.id, name: c.name, input }
    })

    return calls.length > 0 ? { type: 'tool_calls', calls } : { type: 'text' }
  }

  async testConnection(config: ResolvedProviderConfig): Promise<void> {
    const baseUrl = requireBaseUrl(config)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      })
    })

    if (!response.ok) {
      const text = await readErrorBody(response)
      throw new Error(`Connection test failed: HTTP ${response.status}${text ? ` — ${text}` : ''}`)
    }
  }

  supportsTools(): boolean {
    // Best-effort: most OpenAI-compatible endpoints (OpenAI, OpenRouter, recent Ollama/LM
    // Studio) support function-calling, but this can't be statically verified without a real
    // request. Optimistic default — a genuinely unsupported endpoint surfaces a clear API
    // error on the first agent-mode attempt instead of being silently blocked here.
    return true
  }
}
