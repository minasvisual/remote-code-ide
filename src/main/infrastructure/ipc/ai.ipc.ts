import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { IAiProviderRepo } from '../../domain/ports/IAiProviderRepo'
import type { ISftpService } from '../../domain/ports/ISftpService'
import type { ISshClient } from '../../domain/ports/ISshClient'
import type { AiChatServiceFactory } from '../../adapters/ai/AiChatServiceFactory'
import { ToolRegistry } from '../../adapters/ai/tools/registry'
import { writeFileOutcomeResult } from '../../adapters/ai/tools/writeFileTool'
import type { AgentMessage, FileContext, ResolvedProviderConfig } from '../../domain/ports/IAiChatService'
import type { ToolResult } from '../../domain/entities/AgentTool'
import type {
  NewAiProviderConfig,
  UpdateAiProviderConfig,
  TestAiProviderConfig
} from '../../domain/entities/AiProviderConfig'

const MAX_AGENT_STEPS = 15

interface ChatChunkPayload {
  chatId: string
  delta: string
  status: 'streaming' | 'done' | 'error' | 'cancelled' | 'step_limit'
  error?: string
}

export interface AgentModeOptions {
  sessionId: string
  autoApproveThisTurn: boolean
}

interface ToolCallPendingPayload {
  chatId: string
  callId: string
  name: string
  input: unknown
  autoApproved: boolean
}

interface ToolCallResultPayload {
  chatId: string
  callId: string
  name: string
  result: ToolResult
  autoApproved: boolean
}

interface PendingApproval {
  resolve(decision: 'approve' | 'deny'): void
}

export function registerAiIpc(
  repo: IAiProviderRepo,
  chatFactory: AiChatServiceFactory,
  sftpService: ISftpService,
  sshClient: ISshClient
): void {
  const activeChats = new Map<string, AbortController>()
  const pendingApprovals = new Map<string, PendingApproval>()
  const toolRegistry = new ToolRegistry(sftpService, sshClient)

  ipcMain.handle('ai:providers:list', async () => {
    try {
      return { success: true, data: await repo.list() }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:save', async (_e, config: NewAiProviderConfig) => {
    try {
      return { success: true, data: await repo.save(config) }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:update', async (_e, config: UpdateAiProviderConfig) => {
    try {
      return { success: true, data: await repo.update(config) }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:delete', async (_e, id: string) => {
    try {
      await repo.delete(id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:setDefault', async (_e, id: string) => {
    try {
      await repo.setDefault(id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:test', async (_e, test: TestAiProviderConfig) => {
    try {
      const resolved: ResolvedProviderConfig = {
        providerType: test.providerType,
        baseUrl: test.baseUrl,
        model: test.model,
        apiKey: test.plainApiKey
      }
      await chatFactory.forConfig(resolved).testConnection(resolved)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:providers:supportsTools', async () => {
    try {
      const providers = await repo.list()
      const defaultProvider = providers.find((p) => p.isDefault)
      if (!defaultProvider) return { success: true, data: false }
      const supports = chatFactory.forConfig({ providerType: defaultProvider.providerType }).supportsTools()
      return { success: true, data: supports }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Returns { chatId } immediately (before the turn settles) so the renderer can correlate
  // ai:chat:chunk/toolCallPending/toolCallResult events and issue ai:chat:cancel while it's
  // still in flight, mirroring sftp:downloadFile/sftp:searchInFolder.
  ipcMain.handle(
    'ai:chat:send',
    (
      _e,
      messages: AgentMessage[],
      fileContext: FileContext | null,
      agentOptions: AgentModeOptions | null
    ) => {
      const chatId = uuidv4()
      const controller = new AbortController()
      activeChats.set(chatId, controller)

      const sendChunk = (payload: Omit<ChatChunkPayload, 'chatId'>) => {
        try {
          _e.sender.send('ai:chat:chunk', { chatId, ...payload })
        } catch {}
      }
      const sendToolPending = (payload: Omit<ToolCallPendingPayload, 'chatId'>) => {
        try {
          _e.sender.send('ai:chat:toolCallPending', { chatId, ...payload })
        } catch {}
      }
      const sendToolResult = (payload: Omit<ToolCallResultPayload, 'chatId'>) => {
        try {
          _e.sender.send('ai:chat:toolCallResult', { chatId, ...payload })
        } catch {}
      }

      function awaitApproval(callId: string): Promise<'approve' | 'deny'> {
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            pendingApprovals.delete(callId)
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
          }
          controller.signal.addEventListener('abort', onAbort, { once: true })
          pendingApprovals.set(callId, {
            resolve: (decision) => {
              controller.signal.removeEventListener('abort', onAbort)
              pendingApprovals.delete(callId)
              resolve(decision)
            }
          })
        })
      }

      async function resolveDefaultProvider(): Promise<ResolvedProviderConfig> {
        const providers = await repo.list()
        const defaultProvider = providers.find((p) => p.isDefault)
        if (!defaultProvider) throw new Error('No default AI provider configured')
        const apiKey = await repo.getDecryptedApiKey(defaultProvider.id)
        return {
          providerType: defaultProvider.providerType,
          baseUrl: defaultProvider.baseUrl,
          model: defaultProvider.model,
          apiKey
        }
      }

      async function runPlainTurn(): Promise<'done'> {
        const resolved = await resolveDefaultProvider()
        await chatFactory.forConfig(resolved).sendMessage(resolved, messages, fileContext, null, {
          onChunk: (delta) => sendChunk({ delta, status: 'streaming' }),
          signal: controller.signal
        })
        return 'done'
      }

      async function runAgentTurn(agentOpts: AgentModeOptions): Promise<'done' | 'step_limit'> {
        const resolved = await resolveDefaultProvider()
        const service = chatFactory.forConfig(resolved)
        const history: AgentMessage[] = [...messages]
        const tools = toolRegistry.definitions

        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
          if (controller.signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' })

          const result = await service.sendMessage(resolved, history, fileContext, tools, {
            onChunk: (delta) => sendChunk({ delta, status: 'streaming' }),
            signal: controller.signal
          })

          if (result.type === 'text') return 'done'

          history.push({ role: 'assistant', toolCalls: result.calls })

          for (const call of result.calls) {
            if (controller.signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' })

            // write_file never mutates directly — the renderer commits the change (tab update
            // or direct SFTP write) via the existing diff-review flow, then reports the
            // outcome back through the same approve/deny channel. Main always waits for that
            // report, even when auto-approved — only the renderer knows whether a tab is open.
            if (toolRegistry.isWriteFile(call.name)) {
              const preview = await toolRegistry.prepareWriteFileDiff(agentOpts.sessionId, call.input)
              sendToolPending({
                callId: call.id,
                name: call.name,
                input: preview,
                autoApproved: agentOpts.autoApproveThisTurn
              })
              const decision = await awaitApproval(call.id)
              const toolResult = writeFileOutcomeResult(decision === 'approve')
              sendToolResult({
                callId: call.id,
                name: call.name,
                result: toolResult,
                autoApproved: agentOpts.autoApproveThisTurn
              })
              history.push({
                role: 'tool',
                toolCallId: call.id,
                content: toolResult.content,
                isError: toolResult.isError
              })
              continue
            }

            const mutating = toolRegistry.isMutating(call.name)
            if (mutating && !agentOpts.autoApproveThisTurn) {
              sendToolPending({ callId: call.id, name: call.name, input: call.input, autoApproved: false })
              const decision = await awaitApproval(call.id)
              if (decision === 'deny') {
                const toolResult: ToolResult = { content: 'User denied this action.', isError: false }
                sendToolResult({ callId: call.id, name: call.name, result: toolResult, autoApproved: false })
                history.push({
                  role: 'tool',
                  toolCallId: call.id,
                  content: toolResult.content,
                  isError: toolResult.isError
                })
                continue
              }
            }

            const toolResult = await toolRegistry.execute(agentOpts.sessionId, call.name, call.input)
            sendToolResult({
              callId: call.id,
              name: call.name,
              result: toolResult,
              autoApproved: mutating && agentOpts.autoApproveThisTurn
            })
            history.push({
              role: 'tool',
              toolCallId: call.id,
              content: toolResult.content,
              isError: toolResult.isError
            })
          }
        }

        return 'step_limit'
      }

      const runner = agentOptions ? runAgentTurn(agentOptions) : runPlainTurn()

      runner
        .then((outcome) => sendChunk({ delta: '', status: outcome }))
        .catch((err: unknown) => {
          const isAbort = (err as { name?: string }).name === 'AbortError'
          sendChunk({
            delta: '',
            status: isAbort ? 'cancelled' : 'error',
            error: isAbort ? undefined : (err as Error).message
          })
        })
        .finally(() => activeChats.delete(chatId))

      return { chatId }
    }
  )

  ipcMain.handle('ai:chat:cancel', (_e, chatId: string) => {
    activeChats.get(chatId)?.abort()
  })

  ipcMain.handle('ai:chat:approveTool', (_e, callId: string) => {
    pendingApprovals.get(callId)?.resolve('approve')
  })

  ipcMain.handle('ai:chat:denyTool', (_e, callId: string) => {
    pendingApprovals.get(callId)?.resolve('deny')
  })
}
