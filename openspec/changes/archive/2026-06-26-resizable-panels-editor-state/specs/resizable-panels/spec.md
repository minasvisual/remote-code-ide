## ADDED Requirements

### Requirement: Sidebar is horizontally resizable via drag handle
The IDE SHALL display a drag handle on the right edge of the sidebar panel. The user SHALL be able to drag this handle to resize the sidebar width. The sidebar width MUST be constrained between 150px and 500px.

#### Scenario: User drags sidebar handle to the right
- **WHEN** user presses and drags the sidebar resize handle to the right
- **THEN** the sidebar width increases proportionally to the drag distance, up to a maximum of 500px

#### Scenario: User drags sidebar handle to the left
- **WHEN** user presses and drags the sidebar resize handle to the left
- **THEN** the sidebar width decreases proportionally to the drag distance, down to a minimum of 150px

#### Scenario: Drag handle cursor indicator
- **WHEN** user hovers over the sidebar resize handle
- **THEN** the cursor MUST change to `col-resize` to indicate horizontal resize capability

### Requirement: Terminal panel is vertically resizable via drag handle
The IDE SHALL display a drag handle on the top edge of the terminal panel (replacing or augmenting the terminal toggle bar). The user SHALL be able to drag this handle to resize the terminal panel height relative to the editor area. The terminal height MUST be constrained between 15% and 70% of the main area height.

#### Scenario: User drags terminal handle upward
- **WHEN** the terminal is open and user drags the terminal resize handle upward
- **THEN** the terminal panel height increases (editor area shrinks), up to a maximum of 70%

#### Scenario: User drags terminal handle downward
- **WHEN** the terminal is open and user drags the terminal resize handle downward
- **THEN** the terminal panel height decreases (editor area grows), down to a minimum of 15%

#### Scenario: Drag handle cursor indicator for terminal
- **WHEN** user hovers over the terminal resize handle
- **THEN** the cursor MUST change to `row-resize` to indicate vertical resize capability

#### Scenario: Terminal closed state
- **WHEN** the terminal is closed
- **THEN** the terminal resize handle MUST NOT be visible, and the editor area MUST occupy the full remaining height

### Requirement: Drag handles provide smooth resizing with overlay
During a drag operation, the system SHALL display a transparent overlay to capture all mouse events, preventing text selection and ensuring smooth tracking even when the cursor leaves the handle area.

#### Scenario: Mouse leaves handle during drag
- **WHEN** user is dragging a resize handle and moves the mouse outside the handle element
- **THEN** the drag operation MUST continue tracking the mouse position until mouseup
