## ADDED Requirements

### Requirement: Copy selected text from terminal
The system SHALL allow the user to copy text that is selected in the terminal to the system clipboard.

#### Scenario: Copy via keyboard shortcut on Windows/Linux
- **WHEN** the user has text selected in the terminal AND presses Ctrl+Shift+C
- **THEN** the selected text SHALL be written to the system clipboard AND the selection SHALL remain visible

#### Scenario: Copy via keyboard shortcut on macOS
- **WHEN** the user has text selected in the terminal AND presses Cmd+C
- **THEN** the selected text SHALL be written to the system clipboard

#### Scenario: Copy via context menu
- **WHEN** the user has text selected in the terminal AND right-clicks AND clicks "Copy"
- **THEN** the selected text SHALL be written to the system clipboard AND the context menu SHALL close

#### Scenario: Copy with no selection
- **WHEN** the user triggers copy (keyboard or context menu) with no text selected
- **THEN** no clipboard operation SHALL occur AND Ctrl+C on Windows/Linux SHALL be sent to the shell as normal (SIGINT)

### Requirement: Paste clipboard text into terminal
The system SHALL allow the user to paste text from the system clipboard into the terminal input.

#### Scenario: Paste via keyboard shortcut on Windows/Linux
- **WHEN** the user presses Ctrl+Shift+V in the terminal
- **THEN** the system clipboard text SHALL be sent to the terminal as input

#### Scenario: Paste via keyboard shortcut on macOS
- **WHEN** the user presses Cmd+V in the terminal
- **THEN** the system clipboard text SHALL be sent to the terminal as input

#### Scenario: Paste via context menu
- **WHEN** the user right-clicks in the terminal AND clicks "Paste"
- **THEN** the system clipboard text SHALL be sent to the terminal as input AND the context menu SHALL close

#### Scenario: Paste with empty clipboard
- **WHEN** the user triggers paste AND the system clipboard is empty or unreadable
- **THEN** no input SHALL be sent to the terminal

### Requirement: Terminal context menu
The system SHALL display a context menu on right-click within the terminal area with Copy and Paste actions.

#### Scenario: Context menu appears on right-click
- **WHEN** the user right-clicks inside the terminal area
- **THEN** a context menu SHALL appear at the cursor position with "Copy" and "Paste" options

#### Scenario: Context menu Copy disabled when no selection
- **WHEN** the context menu is shown AND no text is selected in the terminal
- **THEN** the "Copy" option SHALL be visually disabled

#### Scenario: Context menu closes on click-away
- **WHEN** the context menu is visible AND the user clicks outside of it
- **THEN** the context menu SHALL close

#### Scenario: Context menu closes on Escape
- **WHEN** the context menu is visible AND the user presses Escape
- **THEN** the context menu SHALL close

### Requirement: Keyboard shortcuts do not conflict with shell signals
The copy shortcut on Windows/Linux SHALL use Ctrl+Shift+C (not Ctrl+C) to avoid conflicting with SIGINT.

#### Scenario: Ctrl+C sends SIGINT
- **WHEN** the user presses Ctrl+C (without Shift) in the terminal
- **THEN** the keypress SHALL be forwarded to the shell as a SIGINT signal (default xterm behavior)

#### Scenario: Ctrl+Shift+C copies text
- **WHEN** the user presses Ctrl+Shift+C with text selected
- **THEN** the text SHALL be copied to clipboard AND the keypress SHALL NOT be forwarded to the shell
