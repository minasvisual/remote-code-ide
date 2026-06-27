## Context

The integrated terminal (`TerminalPanel.tsx`) uses `@xterm/xterm` v5 with `@xterm/addon-fit`. Currently there is no clipboard integration — users cannot copy selected text or paste from the system clipboard. The terminal runs in the renderer process and all clipboard operations can use the browser's `navigator.clipboard` API without new IPC channels.

xterm.js v5 has built-in selection support (mouse select highlights text) but no automatic clipboard wiring. The `@xterm/addon-clipboard` exists but targets xterm v6 beta and is not compatible with the project's v5 dependency.

## Goals / Non-Goals

**Goals:**
- Copy selected terminal text to the system clipboard via keyboard shortcut or context menu
- Paste system clipboard text into the terminal via keyboard shortcut or context menu
- Platform-aware shortcuts (Ctrl+Shift+C/V on Windows/Linux, Cmd+C/V on macOS)
- Right-click context menu with Copy and Paste options

**Non-Goals:**
- Upgrading xterm to v6 beta
- Drag-and-drop text into the terminal
- Copy as HTML/rich text (plain text only)
- Custom clipboard history or multi-paste

## Decisions

### 1. Use xterm's built-in selection API + `navigator.clipboard` instead of `@xterm/addon-clipboard`

The `@xterm/addon-clipboard` package requires xterm v6 beta, which the project doesn't use. xterm v5's `Terminal` already exposes:
- `term.getSelection()` — returns the selected text as a string
- `term.select(column, row, length)` — for programmatic selection
- `term.clearSelection()` — clears the highlight

Combined with `navigator.clipboard.writeText()` / `navigator.clipboard.readText()`, this provides full copy/paste without extra dependencies.

**Alternative considered:** Upgrading to xterm v6 + addon-clipboard. Rejected because it's a beta dependency and would introduce unrelated risk.

### 2. Register custom key handlers on the Terminal instance via `term.attachCustomKeyEventHandler`

xterm's `attachCustomKeyEventHandler` lets us intercept key events before xterm processes them. This is the right hook for clipboard shortcuts because:
- On Windows/Linux: Ctrl+Shift+C (copy) and Ctrl+Shift+V (paste) won't conflict with shell signals — Ctrl+C (without Shift) remains SIGINT
- On macOS: Cmd+C / Cmd+V are naturally handled since Cmd is `metaKey`, not `ctrlKey`
- The handler returns `false` to suppress xterm's default handling for these combos

**Alternative considered:** Global `keydown` listener on the container `div`. Rejected because it doesn't integrate with xterm's key event lifecycle and could interfere with other shortcuts.

### 3. Custom context menu built as a React component

A simple positioned `<div>` rendered inside `TerminalPanel` with two actions: Copy and Paste. Shown on right-click (`contextmenu` event on the terminal container), hidden on click-away or action execution. Styled with `ide-*` tokens to match the IDE theme.

**Alternative considered:** Using Electron's native `Menu.buildFromTemplate` via IPC. Rejected because it requires a new IPC channel and the browser-based approach is simpler, more themeable, and sufficient.

## Risks / Trade-offs

- **[Clipboard permissions]** → `navigator.clipboard.readText()` requires a secure context and may prompt the user the first time. Electron's renderer is considered a secure context, and by default clipboard access is allowed. Mitigation: use a try/catch and fall back to `notify('error', ...)` if denied.
- **[Ctrl+C ambiguity on Windows/Linux]** → Ctrl+C without Shift must remain SIGINT, not copy. Mitigation: the key handler explicitly checks for `Shift` modifier before intercepting.
- **[Focus management]** → The context menu must not steal focus from the terminal. Mitigation: use `mousedown` prevention on the menu and refocus the terminal after action.
