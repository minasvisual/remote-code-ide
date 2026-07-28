import {
  createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import { useApp } from './AppContext'
import { useEditor } from './EditorContext'
import type {
  AiProviderConfig,
  NewAiProviderConfig,
  UpdateAiProviderConfig,
  TestAiProviderConfig
} from '../../domain/entities/AiProviderConfig'
import type {
  AiChatMessage,
  AiFileContext,
  AiChatChunkEvent,
  AiToolCallPendingEvent,
  AiToolCallResultEvent,
  AiToolCallResult,
  TestResult
} from '../../domain/ports/IRemoteApi'

const MAX_FILE_CONTEXT_SIZE = 5 * 1024 * 1024

export interface ToolCallUIState {
  id: string
  name: string
  input: unknown
  status: 'pending' | 'done'
  result?: AiToolCallResult
  autoApproved: boolean
}

export interface ChatUIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'done' | 'streaming' | 'error' | 'cancelled' | 'step_limit'
  error?: string
  toolCalls?: ToolCallUIState[]
}

interface AiChatContextValue {
  providers: AiProviderConfig[]
  messages: ChatUIMessage[]
  isSending: boolean
  agentMode: boolean
  setAgentMode(value: boolean): void
  autoApproveThisTurn: boolean
  setAutoApproveThisTurn(value: boolean): void
  /** Whether Agent mode can currently be turned on (active SSH session + tool-capable provider). */
  agentModeAvailable: boolean
  refreshProviders(): Promise<void>
  saveProvider(config: NewAiProviderConfig): Promise<AiProviderConfig>
  updateProvider(config: UpdateAiProviderConfig): Promise<AiProviderConfig>
  deleteProvider(id: string): Promise<void>
  setDefaultProvider(id: string): Promise<void>
  testProvider(config: TestAiProviderConfig): Promise<TestResult>
  sendMessage(text: string): Promise<void>
  cancel(): void
  approveTool(callId: string): void
  denyTool(callId: string): void
}

const AiChatContext = createContext<AiChatContextValue | null>(null)

export function AiChatProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const { notify, activeSession } = useApp()
  const { tabs, activeTabId } = useEditor()
  const [providers, setProviders] = useState<AiProviderConfig[]>([])
  const [messages, setMessages] = useState<ChatUIMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [agentMode, setAgentMode] = useState(false)
  const [autoApproveThisTurn, setAutoApproveThisTurn] = useState(false)
  const [agentModeSupported, setAgentModeSupported] = useState(false)
  const currentChatIdRef = useRef<string | null>(null)

  const refreshProviders = useCallback(async () => {
    const list = await api.ai.providers.list()
    setProviders(list)
  }, [api])

  useEffect(() => {
    refreshProviders()
  }, [refreshProviders])

  useEffect(() => {
    let cancelled = false
    api.ai.providers
      .supportsTools()
      .then((supported) => {
        if (!cancelled) setAgentModeSupported(supported)
      })
      .catch(() => {
        if (!cancelled) setAgentModeSupported(false)
      })
    return () => {
      cancelled = true
    }
  }, [api, providers])

  const agentModeAvailable = !!activeSession && agentModeSupported

  useEffect(() => {
    if (!agentModeAvailable && agentMode) setAgentMode(false)
  }, [agentModeAvailable, agentMode])

  useEffect(() => {
    return api.ai.chat.onChunk((event: AiChatChunkEvent) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== event.chatId) return m
          if (event.status === 'streaming') return { ...m, content: m.content + event.delta }
          return { ...m, status: event.status, error: event.error }
        })
      )
      if (event.status !== 'streaming') {
        if (event.status === 'error') notify('error', `AI response failed: ${event.error ?? 'unknown error'}`)
        if (event.status === 'step_limit') notify('info', 'Agent stopped after reaching the step limit')
        currentChatIdRef.current = null
        setIsSending(false)
      }
    })
  }, [api, notify])

  useEffect(() => {
    return api.ai.chat.onToolCallPending((event: AiToolCallPendingEvent) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== event.chatId) return m
          const toolCalls = m.toolCalls ?? []
          return {
            ...m,
            toolCalls: [
              ...toolCalls,
              { id: event.callId, name: event.name, input: event.input, status: 'pending', autoApproved: event.autoApproved }
            ]
          }
        })
      )
    })
  }, [api])

  useEffect(() => {
    return api.ai.chat.onToolCallResult((event: AiToolCallResultEvent) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== event.chatId) return m
          const toolCalls = m.toolCalls ?? []
          const existingIdx = toolCalls.findIndex((tc) => tc.id === event.callId)
          if (existingIdx >= 0) {
            return {
              ...m,
              toolCalls: toolCalls.map((tc, i) =>
                i === existingIdx
                  ? { ...tc, status: 'done' as const, result: event.result, autoApproved: event.autoApproved }
                  : tc
              )
            }
          }
          return {
            ...m,
            toolCalls: [
              ...toolCalls,
              {
                id: event.callId,
                name: event.name,
                input: undefined,
                status: 'done',
                result: event.result,
                autoApproved: event.autoApproved
              }
            ]
          }
        })
      )
    })
  }, [api])

  const saveProvider = useCallback(
    async (config: NewAiProviderConfig) => {
      const saved = await api.ai.providers.save(config)
      setProviders((prev) => [...prev, saved])
      return saved
    },
    [api]
  )

  const updateProvider = useCallback(
    async (config: UpdateAiProviderConfig) => {
      const updated = await api.ai.providers.update(config)
      setProviders((prev) => prev.map((p) => (p.id === config.id ? updated : p)))
      return updated
    },
    [api]
  )

  const deleteProvider = useCallback(
    async (id: string) => {
      await api.ai.providers.delete(id)
      setProviders((prev) => prev.filter((p) => p.id !== id))
    },
    [api]
  )

  const setDefaultProvider = useCallback(
    async (id: string) => {
      await api.ai.providers.setDefault(id)
      await refreshProviders()
    },
    [api, refreshProviders]
  )

  const testProvider = useCallback(
    (config: TestAiProviderConfig) => api.ai.providers.test(config),
    [api]
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSending) return

      const defaultProvider = providers.find((p) => p.isDefault)
      if (!defaultProvider) {
        notify('error', 'Configure an AI provider before sending a message')
        return
      }

      const useAgentMode = agentMode && agentModeAvailable && !!activeSession
      const turnAutoApprove = useAgentMode && autoApproveThisTurn
      setAutoApproveThisTurn(false)

      const userMessage: ChatUIMessage = { id: uuidv4(), role: 'user', content: trimmed, status: 'done' }
      const history = [...messages, userMessage]
      setMessages(history)
      setIsSending(true)

      let fileContext: AiFileContext | null = null
      const activeTab = tabs.find((t) => t.id === activeTabId)
      if (activeTab) {
        const truncated = activeTab.content.length > MAX_FILE_CONTEXT_SIZE
        fileContext = {
          path: activeTab.remotePath,
          content: truncated ? activeTab.content.slice(0, MAX_FILE_CONTEXT_SIZE) : activeTab.content,
          truncated
        }
        if (truncated) notify('info', `${activeTab.filename} exceeds 5 MB — truncated for AI context`)
      }

      try {
        const apiMessages: AiChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }))
        const agentOptions = useAgentMode
          ? { sessionId: activeSession!.sessionId, autoApproveThisTurn: turnAutoApprove }
          : null
        const { chatId } = await api.ai.chat.send(apiMessages, fileContext, agentOptions)
        currentChatIdRef.current = chatId
        setMessages((prev) => [...prev, { id: chatId, role: 'assistant', content: '', status: 'streaming', toolCalls: [] }])
      } catch (err: unknown) {
        notify('error', `Failed to send message: ${(err as Error).message}`)
        setIsSending(false)
      }
    },
    [api, messages, providers, tabs, activeTabId, isSending, notify, agentMode, agentModeAvailable, autoApproveThisTurn, activeSession]
  )

  const cancel = useCallback(() => {
    if (currentChatIdRef.current) api.ai.chat.cancel(currentChatIdRef.current)
  }, [api])

  const approveTool = useCallback(
    (callId: string) => {
      api.ai.chat.approveTool(callId)
    },
    [api]
  )

  const denyTool = useCallback(
    (callId: string) => {
      api.ai.chat.denyTool(callId)
    },
    [api]
  )

  return (
    <AiChatContext.Provider
      value={{
        providers,
        messages,
        isSending,
        agentMode,
        setAgentMode,
        autoApproveThisTurn,
        setAutoApproveThisTurn,
        agentModeAvailable,
        refreshProviders,
        saveProvider,
        updateProvider,
        deleteProvider,
        setDefaultProvider,
        testProvider,
        sendMessage,
        cancel,
        approveTool,
        denyTool
      }}
    >
      {children}
    </AiChatContext.Provider>
  )
}

export function useAiChat(): AiChatContextValue {
  const ctx = useContext(AiChatContext)
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider')
  return ctx
}
