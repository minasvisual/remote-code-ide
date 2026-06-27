## Why

The integrated terminal currently has no copy/paste support — users cannot select text and copy it to the system clipboard, nor paste clipboard content into the terminal. This is a fundamental usability gap for any IDE terminal, making it impractical for workflows that involve transferring commands or output between the terminal and other applications.

## What Changes

- Enable text selection and copy in the xterm.js terminal via the `@xterm/addon-clipboard` or the built-in selection API
- Enable paste from the system clipboard into the terminal (Ctrl+Shift+V / Cmd+V / right-click)
- Add a right-click context menu on the terminal with Copy and Paste actions
- Ensure keyboard shortcuts (Ctrl+Shift+C / Ctrl+Shift+V on Linux/Windows, Cmd+C / Cmd+V on macOS) work correctly without conflicting with shell signals (Ctrl+C = SIGINT)

## Capabilities

### New Capabilities
- `terminal-clipboard`: Copy selected text from the terminal to system clipboard and paste clipboard content into the terminal, with keyboard shortcuts and context menu

### Modified Capabilities
_None — this adds new behavior to the terminal without changing existing spec-level requirements._

## Impact

- **Code**: `TerminalPanel.tsx` (renderer) — add clipboard addon/logic and context menu
- **Dependencies**: May add `@xterm/addon-clipboard` package (or use xterm's built-in selection + browser Clipboard API)
- **IPC**: No new IPC channels needed — clipboard operations run entirely in the renderer process via the browser Clipboard API
- **Security**: Uses `navigator.clipboard` (already permitted by CSP for same-origin). No credentials or sensitive data cross IPC for this feature
