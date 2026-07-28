import { useState, useRef, useEffect, useMemo } from 'react'
import { useAiChat, type ToolCallUIState } from '../../../application/contexts/AiChatContext'
import { useEditor } from '../../../application/contexts/EditorContext'
import { useApp } from '../../../application/contexts/AppContext'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { Button } from '../commons/Button'
import { Spinner } from '../commons/Spinner'
import { AiProviderSettings } from './AiProviderSettings'
import { DiffReviewModal } from './DiffReviewModal'
import { parseFileEdit } from './parseFileEdit'
import type { AiWriteFileDiffPreview } from '../../../domain/ports/IRemoteApi'

interface ReviewState {
  tabId: string
  path: string
  proposed: string
}

function GearButton({ onClick }: { onClick(): void }) {
  return (
    <button
      onClick={onClick}
      title="AI provider settings"
      className="text-ide-text-muted hover:text-ide-text text-sm"
    >
      ⚙
    </button>
  )
}

function ToolCallRow({
  call,
  onApprove,
  onDeny
}: {
  call: ToolCallUIState
  onApprove(): void
  onDeny(): void
}) {
  const [expanded, setExpanded] = useState(false)
  // write_file's approval is the diff modal itself, not an inline Allow/Deny row.
  const awaitingInlineApproval = call.status === 'pending' && call.name !== 'write_file'
  const command =
    call.name === 'run_command' && call.input && typeof (call.input as { command?: unknown }).command === 'string'
      ? (call.input as { command: string }).command
      : null

  return (
    <div className="border border-ide-border rounded px-2 py-1.5 text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left text-ide-text-muted"
      >
        <span>🔧</span>
        <span className="font-mono text-ide-text">{call.name}</span>
        {call.autoApproved && (
          <span className="text-[10px] px-1 rounded bg-ide-hover text-ide-text-muted">auto-approved</span>
        )}
        {call.status === 'pending' && <span className="text-[10px]">pending…</span>}
        <span className="ml-auto">{expanded ? '▾' : '▸'}</span>
      </button>

      {command && <code className="block mt-1.5 text-ide-text bg-ide-bg px-1.5 py-1 rounded break-all">{command}</code>}

      {expanded && (
        <div className="mt-1.5 pl-4 flex flex-col gap-1 text-ide-text-muted">
          <div className="break-all">input: <span className="font-mono">{JSON.stringify(call.input)}</span></div>
          {call.result && <div className="break-all">result: <span className="font-mono">{call.result.content}</span></div>}
        </div>
      )}

      {awaitingInlineApproval && (
        <div className="flex gap-2 mt-1.5">
          <Button size="sm" variant="ghost" onClick={onDeny}>Deny</Button>
          <Button size="sm" onClick={onApprove}>Allow</Button>
        </div>
      )}
    </div>
  )
}

export function AiChatPanel() {
  const {
    providers,
    messages,
    isSending,
    sendMessage,
    cancel,
    agentMode,
    setAgentMode,
    agentModeAvailable,
    autoApproveThisTurn,
    setAutoApproveThisTurn,
    approveTool,
    denyTool
  } = useAiChat()
  const { tabs, updateContent } = useEditor()
  const { activeSession, notify } = useApp()
  const api = getRemoteApi()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [reviewing, setReviewing] = useState<ReviewState | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const autoCommittedRef = useRef<Set<string>>(new Set())

  const hasProvider = providers.length > 0
  const openPaths = tabs.map((t) => t.remotePath)

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isSending) return
    sendMessage(input)
    setInput('')
  }

  const handleReview = (content: string) => {
    const edit = parseFileEdit(content, openPaths)
    if (!edit) return
    const tab = tabs.find((t) => t.remotePath === edit.path)
    if (!tab) return
    setReviewing({ tabId: tab.id, path: edit.path, proposed: edit.content })
  }

  const handleAccept = () => {
    if (!reviewing) return
    updateContent(reviewing.tabId, reviewing.proposed)
    setReviewing(null)
  }

  const reviewingTab = reviewing ? tabs.find((t) => t.id === reviewing.tabId) : undefined

  // At most one write_file call is pending at a time (tool calls execute sequentially).
  const agentWritePending = useMemo(() => {
    for (const m of messages) {
      const pending = m.toolCalls?.find((tc) => tc.name === 'write_file' && tc.status === 'pending')
      if (pending) return pending
    }
    return null
  }, [messages])

  const commitAgentWrite = async (callId: string, preview: AiWriteFileDiffPreview, accept: boolean) => {
    if (accept) {
      const tab = tabs.find((t) => t.remotePath === preview.path)
      if (tab) {
        updateContent(tab.id, preview.proposedContent)
      } else if (activeSession) {
        try {
          await api.sftp.writeFile(activeSession.sessionId, preview.path, preview.proposedContent)
        } catch (err: unknown) {
          notify('error', `Failed to write ${preview.path}: ${(err as Error).message}`)
        }
      }
      approveTool(callId)
    } else {
      denyTool(callId)
    }
  }

  // Auto-approved agent writes commit immediately, no modal — still visibly tagged in the trace.
  useEffect(() => {
    if (!agentWritePending || !agentWritePending.autoApproved) return
    if (autoCommittedRef.current.has(agentWritePending.id)) return
    autoCommittedRef.current.add(agentWritePending.id)
    commitAgentWrite(agentWritePending.id, agentWritePending.input as AiWriteFileDiffPreview, true)
  }, [agentWritePending])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-ide-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted">
          AI Chat
        </span>
        <GearButton onClick={() => setShowSettings(true)} />
      </div>

      {!hasProvider ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <div className="text-4xl opacity-20">🤖</div>
          <p className="text-xs text-ide-text-muted">Configure an AI provider to start chatting.</p>
          <Button size="sm" onClick={() => setShowSettings(true)}>Configure Provider</Button>
        </div>
      ) : (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-xs text-ide-text-muted text-center mt-4">
                Ask the assistant about the currently open file, or anything else.
              </p>
            )}
            {messages.map((m) => {
              const edit = m.role === 'assistant' && m.status === 'done' ? parseFileEdit(m.content, openPaths) : null
              return (
                <div key={m.id} className="flex flex-col gap-1">
                  <span className="text-xs text-ide-text-muted">{m.role === 'user' ? 'You' : 'Assistant'}</span>
                  <div className="text-sm text-ide-text whitespace-pre-wrap break-words">
                    {m.content}
                    {m.status === 'streaming' && <Spinner size="sm" />}
                  </div>
                  {m.status === 'error' && (
                    <span className="text-xs text-red-400">Error: {m.error ?? 'Something went wrong'}</span>
                  )}
                  {m.status === 'cancelled' && (
                    <span className="text-xs text-ide-text-muted">Cancelled</span>
                  )}
                  {m.status === 'step_limit' && (
                    <span className="text-xs text-ide-text-muted">Agent stopped after reaching the step limit</span>
                  )}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      {m.toolCalls.map((call) => (
                        <ToolCallRow
                          key={call.id}
                          call={call}
                          onApprove={() => approveTool(call.id)}
                          onDeny={() => denyTool(call.id)}
                        />
                      ))}
                    </div>
                  )}
                  {edit && (
                    <Button size="sm" variant="ghost" className="self-start" onClick={() => handleReview(m.content)}>
                      Review edit to {edit.path}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="border-t border-ide-border">
            <div className="px-3 pt-2 flex flex-col gap-1.5">
              <label
                className="flex items-center gap-2 text-xs text-ide-text-muted cursor-pointer"
                title={!agentModeAvailable ? 'Requires an active connection and a tool-capable provider' : undefined}
              >
                <input
                  type="checkbox"
                  checked={agentMode}
                  disabled={!agentModeAvailable}
                  onChange={(e) => setAgentMode(e.target.checked)}
                  className="accent-ide-accent"
                />
                Agent mode
                {!agentModeAvailable && <span className="italic">(requires an active connection)</span>}
              </label>
              {agentMode && (
                <label className="flex items-center gap-2 text-xs text-ide-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApproveThisTurn}
                    onChange={(e) => setAutoApproveThisTurn(e.target.checked)}
                    className="accent-ide-accent"
                  />
                  Auto-approve this turn
                </label>
              )}
            </div>
            <div className="p-3 flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                rows={2}
                placeholder="Message the assistant…"
                disabled={isSending}
                className="flex-1 bg-[#3c3c3c] border border-ide-border rounded px-2 py-1.5 text-sm text-ide-text placeholder-ide-text-muted focus:outline-none focus:border-ide-accent resize-none disabled:opacity-50"
              />
              {isSending ? (
                <Button variant="ghost" onClick={cancel}>Cancel</Button>
              ) : (
                <Button onClick={handleSend} disabled={!input.trim()}>Send</Button>
              )}
            </div>
          </div>
        </>
      )}

      {showSettings && <AiProviderSettings onClose={() => setShowSettings(false)} />}

      {reviewing && reviewingTab && (
        <DiffReviewModal
          path={reviewing.path}
          original={reviewingTab.content}
          proposed={reviewing.proposed}
          onAccept={handleAccept}
          onReject={() => setReviewing(null)}
        />
      )}

      {agentWritePending && !agentWritePending.autoApproved && (
        <DiffReviewModal
          path={(agentWritePending.input as AiWriteFileDiffPreview).path}
          original={(agentWritePending.input as AiWriteFileDiffPreview).currentContent}
          proposed={(agentWritePending.input as AiWriteFileDiffPreview).proposedContent}
          onAccept={() => commitAgentWrite(agentWritePending.id, agentWritePending.input as AiWriteFileDiffPreview, true)}
          onReject={() => commitAgentWrite(agentWritePending.id, agentWritePending.input as AiWriteFileDiffPreview, false)}
        />
      )}
    </div>
  )
}
