import { useState } from 'react'
import { Button } from '../commons/Button'
import { Input } from '../commons/Input'
import { Spinner } from '../commons/Spinner'
import { useAiChat } from '../../../application/contexts/AiChatContext'
import { useApp } from '../../../application/contexts/AppContext'
import type { AiProviderConfig, AiProviderType } from '../../../domain/entities/AiProviderConfig'

interface Props {
  onClose(): void
}

interface FormState {
  label: string
  providerType: AiProviderType
  baseUrl: string
  model: string
  plainApiKey: string
}

const EMPTY_FORM: FormState = {
  label: '',
  providerType: 'anthropic',
  baseUrl: '',
  model: '',
  plainApiKey: ''
}

export function AiProviderSettings({ onClose }: Props) {
  const { providers, saveProvider, updateProvider, deleteProvider, setDefaultProvider, testProvider } = useAiChat()
  const { notify } = useApp()
  const [editing, setEditing] = useState<AiProviderConfig | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')

  const set = (field: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setTestStatus('idle')
    setShowForm(true)
  }

  const openEdit = (p: AiProviderConfig) => {
    setEditing(p)
    setForm({ label: p.label, providerType: p.providerType, baseUrl: p.baseUrl ?? '', model: p.model, plainApiKey: '' })
    setTestStatus('idle')
    setShowForm(true)
  }

  const validateBaseUrl = () => {
    if (form.providerType === 'openai-compatible' && !form.baseUrl.trim()) {
      notify('error', 'Base URL is required for OpenAI-compatible providers')
      return false
    }
    return true
  }

  const handleTest = async () => {
    if (!form.model || !form.plainApiKey) {
      notify('error', 'Model and API key are required to test the connection')
      return
    }
    if (!validateBaseUrl()) return

    setTestStatus('testing')
    try {
      const result = await testProvider({
        providerType: form.providerType,
        baseUrl: form.baseUrl.trim() || undefined,
        model: form.model,
        plainApiKey: form.plainApiKey
      })
      setTestStatus(result.success ? 'ok' : 'fail')
      setTestMessage(result.message)
    } catch (err: unknown) {
      setTestStatus('fail')
      setTestMessage((err as Error).message)
    }
  }

  const handleSave = async () => {
    if (!form.label || !form.model || (!editing && !form.plainApiKey)) {
      notify('error', 'Label, model and API key are required')
      return
    }
    if (!validateBaseUrl()) return

    setIsSaving(true)
    try {
      if (editing) {
        await updateProvider({
          id: editing.id,
          label: form.label,
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || undefined,
          model: form.model,
          plainApiKey: form.plainApiKey || undefined
        })
        notify('success', `Provider "${form.label}" updated`)
      } else {
        await saveProvider({
          label: form.label,
          providerType: form.providerType,
          baseUrl: form.baseUrl.trim() || undefined,
          model: form.model,
          plainApiKey: form.plainApiKey
        })
        notify('success', `Provider "${form.label}" saved`)
      }
      setShowForm(false)
    } catch (err: unknown) {
      notify('error', (err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProvider(id)
      notify('info', 'Provider deleted')
    } catch (err: unknown) {
      notify('error', (err as Error).message)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultProvider(id)
    } catch (err: unknown) {
      notify('error', (err as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <span className="text-sm font-semibold text-ide-text">AI Providers</span>
          <button onClick={onClose} className="text-ide-text-muted hover:text-ide-text text-lg leading-none">✕</button>
        </div>

        {!showForm ? (
          <>
            <div className="flex-1 overflow-y-auto">
              {providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="text-xs text-ide-text-muted">No AI providers configured yet.</p>
                </div>
              ) : (
                <ul className="py-1">
                  {providers.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-4 py-2 hover:bg-ide-hover group">
                      <span className="text-ide-accent text-sm" title={p.isDefault ? 'Default' : undefined}>
                        {p.isDefault ? '★' : '☆'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ide-text truncate">{p.label}</p>
                        <p className="text-xs text-ide-text-muted truncate">{p.providerType} · {p.model}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                        {!p.isDefault && (
                          <Button size="sm" variant="ghost" onClick={() => handleSetDefault(p.id)}>
                            Set default
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-ide-border">
              <Button size="sm" onClick={openCreate}>+ New Provider</Button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <Input label="Label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="My Anthropic Key" />

            <div className="flex flex-col gap-1">
              <label className="text-xs text-ide-text-muted">Provider Type</label>
              <div className="flex gap-3">
                {(['anthropic', 'openai-compatible'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-ide-text cursor-pointer">
                    <input
                      type="radio"
                      name="providerType"
                      checked={form.providerType === type}
                      onChange={() => set('providerType', type)}
                      className="accent-ide-accent"
                    />
                    {type === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'}
                  </label>
                ))}
              </div>
            </div>

            <Input
              label={form.providerType === 'anthropic' ? 'Base URL (optional)' : 'Base URL'}
              value={form.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder={form.providerType === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
            />
            <Input label="Model" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="claude-sonnet-4-5" />
            <Input
              label="API Key"
              type="password"
              value={form.plainApiKey}
              onChange={(e) => set('plainApiKey', e.target.value)}
              placeholder={editing ? 'Leave blank to keep current' : 'sk-…'}
            />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleTest} disabled={testStatus === 'testing'}>
                {testStatus === 'testing' ? <Spinner size="sm" /> : null} Test Connection
              </Button>
              {testStatus === 'ok' && <span className="text-xs text-green-400">✓ {testMessage}</span>}
              {testStatus === 'fail' && <span className="text-xs text-red-400">✗ {testMessage}</span>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Spinner size="sm" /> : null} Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
