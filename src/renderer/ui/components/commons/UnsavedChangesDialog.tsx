import { Modal } from './Modal'
import { Button } from './Button'

interface UnsavedChangesDialogProps {
  filename: string
  onSave(): void
  onDiscard(): void
  onCancel(): void
}

export function UnsavedChangesDialog({ filename, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <Modal
      title="Unsaved Changes"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onDiscard}>Discard</Button>
          <Button variant="primary" onClick={onSave}>Save &amp; Close</Button>
        </>
      }
    >
      <p className="text-sm text-ide-text">
        <span className="font-medium">{filename}</span> has unsaved changes. What would you like to do?
      </p>
    </Modal>
  )
}
