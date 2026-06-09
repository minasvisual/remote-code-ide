import { useState } from 'react'
import { Modal } from '../commons/Modal'
import { Input } from '../commons/Input'
import { Button } from '../commons/Button'
import type { Connection } from '../../../domain/entities/Connection'

interface Props {
  connection: Connection
  onConfirm(): void
  onClose(): void
}

export function DeleteConnectionModal({ connection, onConfirm, onClose }: Props) {
  const [value, setValue] = useState('')
  const canDelete = value.toLowerCase() === 'excluir'

  return (
    <Modal
      title="Delete Connection"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={!canDelete}>
            Delete
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ide-text">
          Are you sure you want to delete <span className="text-ide-accent font-semibold">{connection.label}</span>?
          This action cannot be undone.
        </p>
        <p className="text-xs text-ide-text-muted">
          Type <span className="font-mono text-ide-text">excluir</span> to confirm.
        </p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="excluir"
          autoFocus
        />
      </div>
    </Modal>
  )
}
