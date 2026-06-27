## 1. Clipboard Keyboard Shortcuts

- [x] 1.1 Add `attachCustomKeyEventHandler` to the Terminal instance in `TerminalPanel.tsx` to intercept Ctrl+Shift+C, Ctrl+Shift+V (Windows/Linux) and Cmd+C, Cmd+V (macOS)
- [x] 1.2 Implement copy handler: read `term.getSelection()`, write to `navigator.clipboard.writeText()`, return `false` to suppress xterm default. If no selection and Ctrl+C (no Shift), allow default (SIGINT)
- [x] 1.3 Implement paste handler: read from `navigator.clipboard.readText()`, write to terminal via `term.paste()` or `api.terminal.sendInput()`, return `false` to suppress xterm default

## 2. Context Menu

- [x] 2.1 Create `TerminalContextMenu` component with Copy and Paste actions, styled with `ide-*` tokens, positioned absolutely at mouse coordinates
- [x] 2.2 Add `contextmenu` event listener on the terminal container in `TerminalPanel.tsx` to show the menu, preventing the browser default
- [x] 2.3 Disable the Copy action visually when `term.getSelection()` is empty
- [x] 2.4 Implement click-away and Escape key dismissal for the context menu
- [x] 2.5 Wire Copy action to clipboard write and Paste action to clipboard read + terminal input

## 3. Integration & Polish

- [x] 3.1 Ensure terminal regains focus after context menu actions
- [x] 3.2 Add error handling (try/catch) around `navigator.clipboard` calls with fallback notification via `notify('error', ...)`
- [x] 3.3 Verify Ctrl+C without Shift still sends SIGINT (manual test)

## 4. Tests

- [x] 4.1 Add unit test for copy keyboard shortcut handler (mocked clipboard + terminal selection)
- [x] 4.2 Add unit test for paste keyboard shortcut handler (mocked clipboard + terminal input)
- [x] 4.3 Add unit test for context menu rendering, disabled Copy state, and dismissal
