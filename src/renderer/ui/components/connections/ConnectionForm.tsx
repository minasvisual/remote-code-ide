import { useState } from 'react'
import { Modal } from '../commons/Modal'
import { Input } from '../commons/Input'
import { Button } from '../commons/Button'
import { Spinner } from '../commons/Spinner'
import { SshKeyTutorialModal } from './SshKeyTutorialModal'
import { useApp } from '../../../application/contexts/AppContext'
import type { Connection, NewConnection } from '../../../domain/entities/Connection'

interface Props {
  connection?: Connection
  onClose(): void
}

export function ConnectionForm({ connection, onClose }: Props) {
  const { saveConnection, updateConnection, testConnection, notify } = useApp()
  const isEdit = !!connection
  const [form, setForm] = useState<NewConnection>({
    label: connection?.label ?? '',
    host: connection?.host ?? '',
    port: connection?.port ?? 22,
    username: connection?.username ?? '',
    authType: connection?.authType ?? 'password',
    initialDirectory: connection?.initialDirectory ?? '',
    plainPassword: '',
    plainPrivateKey: ''
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [showTutorial, setShowTutorial] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const set = (field: keyof NewConnection, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleTest = async () => {
    setTestStatus('testing')
    const result = await testConnection(form)
    setTestStatus(result.success ? 'ok' : 'fail')
    setTestMessage(result.message)
  }

  const handleSave = async () => {
    if (!form.label || !form.host || !form.username) {
      notify('error', 'Label, host and username are required')
      return
    }
    setIsSaving(true)
    try {
      if (isEdit) {
        const payload: Connection = {
          ...connection,
          label: form.label,
          host: form.host,
          port: form.port,
          username: form.username,
          authType: form.authType,
          initialDirectory: form.initialDirectory || undefined,
        }
        if (form.plainPassword) (payload as any).plainPassword = form.plainPassword
        if (form.plainPrivateKey) (payload as any).plainPrivateKey = form.plainPrivateKey
        await updateConnection(payload)
        notify('success', `Connection "${form.label}" updated`)
      } else {
        await saveConnection(form)
        notify('success', `Connection "${form.label}" saved`)
      }
      onClose()
    } catch (err: unknown) {
      notify('error', (err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const credPlaceholder = isEdit ? 'Leave blank to keep current' : undefined

  return (
    <>
    <Modal
      title={isEdit ? 'Edit Connection' : 'New Connection'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : null} Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label="Label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="My Server" />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input label="Host" value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="w-20">
            <Input label="Port" type="number" value={form.port} onChange={(e) => set('port', Number(e.target.value))} />
          </div>
        </div>
        <Input label="Username" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="root" />
        <Input label="Initial Directory" value={form.initialDirectory ?? ''} onChange={(e) => set('initialDirectory', e.target.value)} placeholder="/home/user/projects" />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ide-text-muted">Authentication</label>
          <div className="flex gap-3">
            {(['password', 'privateKey'] as const).map((type) => (
              <label key={type} className="flex items-center gap-1.5 text-sm text-ide-text cursor-pointer">
                <input
                  type="radio"
                  name="authType"
                  value={type}
                  checked={form.authType === type}
                  onChange={() => set('authType', type)}
                  className="accent-ide-accent"
                />
                {type === 'password' ? 'Password' : 'Private Key'}
              </label>
            ))}
          </div>
        </div>

        {form.authType === 'password' ? (
          <Input label="Password" type="password" value={form.plainPassword ?? ''} onChange={(e) => set('plainPassword', e.target.value)} placeholder={credPlaceholder} />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-ide-text-muted">Private Key (PEM content)</label>
              <div className="relative group/info">
                <button
                  type="button"
                  onClick={() => setShowTutorial(true)}
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-ide-text-muted hover:text-ide-accent transition-colors"
                  aria-label="See tutorial on how to generate an OpenSSH key"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a.75.75 0 1 1 0 1.5A.75.75 0 0 1 8 4zm-.25 2.75h.5a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5h-.5a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5z" />
                  </svg>
                </button>
                <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-50 w-56 px-2 py-1.5 rounded bg-[#3c3c3c] border border-ide-border text-[11px] text-ide-text leading-snug shadow-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-normal">
                  See the tutorial on how to generate an OpenSSH key from your private key
                </div>
              </div>
            </div>
            <textarea
              value={form.plainPrivateKey ?? ''}
              onChange={(e) => set('plainPrivateKey', e.target.value)}
              rows={4}
              placeholder={credPlaceholder ?? 'Paste your private key here'}
              className="bg-[#3c3c3c] border border-ide-border rounded px-2 py-1.5 text-xs text-ide-text font-mono placeholder-ide-text-muted focus:outline-none focus:border-ide-accent resize-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleTest} disabled={testStatus === 'testing'}>
            {testStatus === 'testing' ? <Spinner size="sm" /> : null} Test Connection
          </Button>
          {testStatus === 'ok' && <span className="text-xs text-green-400">✓ {testMessage}</span>}
          {testStatus === 'fail' && <span className="text-xs text-red-400">✗ {testMessage}</span>}
        </div>
      </div>
    </Modal>
    {showTutorial && <SshKeyTutorialModal onClose={() => setShowTutorial(false)} />}
    </>
  )
}
