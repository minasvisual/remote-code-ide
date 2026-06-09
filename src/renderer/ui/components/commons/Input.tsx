import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-ide-text-muted">{label}</label>}
      <input
        className={`bg-[#3c3c3c] border border-ide-border rounded px-2 py-1.5 text-sm text-ide-text placeholder-ide-text-muted focus:outline-none focus:border-ide-accent transition-colors ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
