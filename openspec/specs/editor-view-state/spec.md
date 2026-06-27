### Requirement: Editor preserves view state across tab switches
The system SHALL save the Monaco editor view state (cursor position, scroll position, fold state, and text selection) when the user switches away from a tab, and SHALL restore that view state when the user switches back to the tab.

#### Scenario: Switch away and back to a tab
- **WHEN** user has a file open with cursor at line 50, some code folded, and scrolled to a specific position
- **AND** user switches to a different tab
- **AND** user switches back to the original tab
- **THEN** the cursor MUST be at line 50, the same code regions MUST be folded, and the scroll position MUST be restored

#### Scenario: First time opening a tab
- **WHEN** user opens a file for the first time (no prior view state exists)
- **THEN** the editor MUST display the file with default view state (cursor at line 1, column 1, no folds, scrolled to top)

#### Scenario: Tab close cleans up view state
- **WHEN** user closes a tab
- **THEN** the stored view state for that tab MUST be removed from memory

### Requirement: View state is per-tab, not per-file
Each open tab instance SHALL maintain its own independent view state. If the same file were opened in multiple contexts, each instance would have its own cursor and fold state.

#### Scenario: Independent tab state
- **WHEN** user has the same file conceptually open (though current dedup prevents duplicates per session)
- **THEN** each tab instance MUST track its own view state independently, keyed by tab ID
