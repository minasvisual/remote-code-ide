import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface Props {
  targetDir: string
  onConfirm: (filename: string) => void
  onCancel: () => void
  error?: string
  title?: string
  placeholder?: string
}

export function NewFileDialog({ targetDir, onConfirm, onCancel, error, title = 'New File', placeholder = 'filename.ext' }: Props) {
  const [filename, setFilename] = useState('')
  const [validationError, setValidationError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Show either the parent-supplied error (FILE_EXISTS) or local validation error
  const displayError = error ?? validationError

  const handleSubmit = () => {
    const trimmed = filename.trim()
    if (!trimmed) {
      setValidationError('Filename cannot be empty')
      return
    }
    if (trimmed.includes('/')) {
      setValidationError('Filename cannot contain "/"')
      return
    }
    setValidationError(undefined)
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const inDir = targetDir === '/' ? '/' : `${targetDir}/`

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Create</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ide-text-muted">
          Creating in <span className="text-ide-text font-mono">{inDir}</span>
        </p>
        <input
          ref={inputRef}
          className="bg-[#3c3c3c] border border-ide-border rounded px-2 py-1.5 text-sm text-ide-text focus:outline-none focus:border-ide-accent w-full"
          placeholder={placeholder}
          value={filename}
          onChange={(e) => { setFilename(e.target.value); setValidationError(undefined) }}
          onKeyDown={handleKeyDown}
        />
        {displayError && (
          <p className="text-xs text-red-400">{displayError}</p>
        )}
      </div>
    </Modal>
  )
}
