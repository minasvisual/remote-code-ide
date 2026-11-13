## MODIFIED Requirements

### Requirement: Terminal context menu
The system SHALL display a context menu on right-click within the terminal area with Copy and Paste actions. The menu SHALL remain fully visible within the application window regardless of where in the terminal panel it is triggered.

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

#### Scenario: Context menu stays within the window when triggered near the bottom edge
- **WHEN** the user right-clicks near the bottom of a terminal panel that fills the available vertical space
- **THEN** the context menu SHALL be positioned so that it is entirely visible within the window, with none of its options rendered below the visible area
