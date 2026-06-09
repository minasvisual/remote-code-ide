export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
      <div className="text-6xl opacity-10">{'</>'}</div>
      <h1 className="text-xl font-semibold text-ide-text opacity-40">Remote Code IDE</h1>
      <p className="text-sm text-ide-text-muted max-w-xs">
        Connect to a server and open a file to start editing.
      </p>
    </div>
  )
}
