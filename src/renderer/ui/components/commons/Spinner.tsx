interface SpinnerProps {
  size?: 'sm' | 'md'
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  const cls = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'
  return (
    <span
      className={`inline-block ${cls} border-ide-text-muted border-t-ide-accent rounded-full animate-spin`}
    />
  )
}
