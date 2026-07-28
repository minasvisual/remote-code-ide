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

const DEFAULT_BASE_URL = 'https://api.anthropic.com'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 4096

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

interface AnthropicStreamEvent {
  type?: string
  index?: number
  content_block?: { type: string; id?: string; name?: string }
  delta?: { type?: string; text?: string; partial_json?: string }
  error?: { message?: string }
}

async function readErrorBody(response: Response): Promise<string> {
  return response.text().catch(() => '')
}

/** Groups consecutive `tool` messages into a single `user` message with multiple `tool_result` blocks, as Anthropic expects. */
function toAnthropicMessages(messages: AgentMessage[]): AnthropicMessage[] {
  const result: AnthropicMessage[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      result.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant' && 'toolCalls' in m) {
      result.push({
        role: 'assistant',
        content: m.toolCalls.map((c) => ({ type: 'tool_use' as const, id: c.id, name: c.name, input: c.input }))
      })
    } else if (m.role === 'assistant') {
      result.push({ role: 'assistant', content: m.content })
    } else {
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content,
        is_error: m.isError || undefined
      }
      const last = result[result.length - 1]
      if (last?.role === 'user' && Array.isArray(last.content) && last.content.every((b) => b.type === 'tool_result')) {
        last.content.push(block)
      } else {
        result.push({ role: 'user', content: [block] })
      }
    }
  }
  return result
}

export class AnthropicChatAdapter implements IAiChatService {
  async sendMessage(
    config: ResolvedProviderConfig,
    messages: AgentMessage[],
    fileContext: FileContext | null,
    tools: ToolDefinition[] | null,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL
    assertHttpUrl(baseUrl)

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: MAX_TOKENS,
      stream: true,
      system: buildSystemPrompt(fileContext),
      messages: toAnthropicMessages(messages)
    }
    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(body),
      signal: options.signal
    })

    if (!response.ok || !response.body) {
      const text = await readErrorBody(response)
      throw new Error(`Anthropic request failed: HTTP ${response.status}${text ? ` — ${text}` : ''}`)
    }

    interface PendingBlock {
      type: string
      id?: string
      name?: string
      jsonBuffer: string
    }
    const blocks = new Map<number, PendingBlock>()
    const toolCalls: ToolCallRequest[] = []

    for await (const frame of parseSseStream(response.body)) {
      const event = frame as AnthropicStreamEvent

      if (event.type === 'content_block_start' && event.content_block && event.index !== undefined) {
        blocks.set(event.index, {
          type: event.content_block.type,
          id: event.content_block.id,
          name: event.content_block.name,
          jsonBuffer: ''
        })
      } else if (event.type === 'content_block_delta' && event.index !== undefined) {
        const block = blocks.get(event.index)
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          options.onChunk(event.delta.text)
        } else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json && block) {
          block.jsonBuffer += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop' && event.index !== undefined) {
        const block = blocks.get(event.index)
        if (block?.type === 'tool_use' && block.id && block.name) {
          let input: unknown = {}
          try {
            input = block.jsonBuffer ? JSON.parse(block.jsonBuffer) : {}
          } catch {
            input = {}
          }
          toolCalls.push({ id: block.id, name: block.name, input })
        }
      } else if (event.type === 'error') {
        throw new Error(event.error?.message ?? 'Anthropic streaming error')
      }
    }

    return toolCalls.length > 0 ? { type: 'tool_calls', calls: toolCalls } : { type: 'text' }
  }

  async testConnection(config: ResolvedProviderConfig): Promise<void> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL
    assertHttpUrl(baseUrl)

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION
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
    // All current Claude models on the Messages API support tool use.
    return true
  }
}
