## Context

`TerminalContextMenu.tsx` and `ConnectionContextMenu.tsx` both render a `position: fixed` menu at coordinates taken from the triggering mouse event. Only `ConnectionContextMenu` clamps the position, using hardcoded `MENU_WIDTH`/`MENU_HEIGHT` constants because its menu always has exactly two fixed-height items. `TerminalContextMenu` has no clamping at all, so a right-click near the bottom of a terminal that fills the panel's height places the menu partly or fully below `window.innerHeight`.

`App.tsx`'s `IDELayout` renders exactly one sidebar panel at a time via a ternary chain (`sidebarView === 'about' ? <AboutPanel/> : ... : <FileExplorer/>`). Switching `sidebarView` unmounts the previous panel and mounts the new one. `FileExplorer` keeps its fetched root listing in local `useState`, and each `TreeNode` keeps its own `isExpanded`/`children`/`loaded` state locally with no lift to a context — none of it survives an unmount. `ConnectionManager`, `ExtensionsPanel`, and `AboutPanel` have no mount-time side effects (no fetch-on-mount `useEffect`), so mounting them earlier/longer has no added cost.

See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Terminal context menu is always fully visible regardless of where in the terminal panel it is triggered
- `FileExplorer`'s expanded-folder tree and fetched listings survive switching to another sidebar view and back
- Reuse one clamping implementation instead of maintaining two copies of the same logic

**Non-Goals:**
- Fixing the identical unclamped-position bug in the shared `commons/ContextMenu.tsx` (used by the file explorer's own right-click menus) — not part of the reported bugs, left as a follow-up
- Persisting explorer/tree state across disconnect/reconnect or app restart — only the in-session sidebar-view-switch case is in scope
- Any change to `AiChatContext`/`AiChatPanel` state handling — its messages already live in a provider above `IDELayout` and are unaffected by this change

## Decisions

### 1 — Measure-then-clamp via a shared `useClampedMenuPosition` hook, not hardcoded dimensions

**Decision**: Add `src/renderer/ui/components/commons/useClampedMenuPosition.ts`, a hook that takes the raw `(x, y)` click coordinates and a ref to the menu element, measures the rendered element via `getBoundingClientRect()` in a `useLayoutEffect`, and returns a clamped `{ left, top }` style: `left = Math.min(x, window.innerWidth - rect.width - 4)`, `top = Math.min(y, window.innerHeight - rect.height - 4)`, each additionally floored at `4` so a menu taller/wider than the viewport doesn't get pushed to a negative offset. `useLayoutEffect` runs before paint, so there is no visible flash at the wrong position.

`TerminalContextMenu` adopts this hook directly. `ConnectionContextMenu` is refactored to use it too, replacing its hardcoded `MENU_WIDTH`/`MENU_HEIGHT` constants — behavior is unchanged (it already clamped, just with estimated instead of measured dimensions), so no spec delta is needed for `connection-context-menu`.

**Alternatives considered**:
- *Keep hardcoded constants per menu, add a second pair for the terminal menu*: Works for the terminal menu's fixed two-item content, but duplicates the same magic-number pattern a third time and would need updating by hand if either menu's content changes.
- *CSS-only fix (e.g. `max-height` + anchor from the opposite corner)*: Doesn't work for a menu that can open at any point in a tall scrollable panel — the correct anchor corner depends on where the click occurred, which still requires measuring against viewport bounds in JS.

### 2 — Keep all sidebar panels mounted; toggle visibility with `display: contents` / `hidden` instead of conditional rendering

**Decision**: In `App.tsx`, replace the exclusive ternary with all five panels rendered every time, each wrapped in a `<div className={isActive ? 'contents' : 'hidden'}>`. `hidden` (`display: none`) removes an inactive panel from layout and paint while keeping it mounted, so its React state is untouched. `contents` on the active panel's wrapper makes the wrapper itself invisible to layout, so the panel's own root element (which already carries `h-full`/`flex flex-col`) becomes the direct flex child of the sidebar container exactly as before — no layout behavior changes for the visible panel.

**Alternatives considered**:
- *Lift `FileExplorer`'s tree state into `AppContext`*: Fixes the same symptom but is a much larger change (new context shape, cache invalidation on reconnect, migrating `TreeNode`'s per-node expand/children state up through props or a second context) for a bug whose root cause is simply "the component gets unmounted." Rejected as disproportionate to the fix.
- *`display: none` on both active and inactive, toggling only the active one to `flex`*: Equivalent outcome but requires duplicating each panel's own root layout classes onto the wrapper `div` and keeping them in sync; `contents` avoids that duplication entirely.
- *Keep the ternary but special-case only `FileExplorer` (always-mounted, others still conditional)*: Narrower diff, but leaves the same latent state-loss behavior for any other panel that later grows meaningful local state (e.g. `AiChatPanel` if its state is ever moved out of context), and is less consistent with the second bug report's ask to "keep panel state active when switching sidebar view" in general.

## Risks / Trade-offs

- [All five sidebar panels now mount as soon as `IDELayout` renders, instead of lazily on first visit] → Verified each panel has no fetch-on-mount side effect (`ConnectionManager` has no `useEffect`; `ExtensionsPanel` only searches on user input; `AboutPanel` is static local state); `FileExplorer`'s own mount effect already no-ops when there's no `activeSession`. No added network/IPC calls at startup.
- [`display: contents` has known accessibility quirks in some browsers (e.g. dropped ARIA semantics on the wrapper) — not relevant here since the wrapper carries no semantics of its own, but worth flagging] → No `role`/`aria-*` attributes are placed on the wrapper `div`, so there is nothing for `contents` to strip.
- [Explorer's own right-click menus (`commons/ContextMenu.tsx`) still clip off-screen near the bottom edge] → Explicitly out of scope (see Non-Goals); same hook can be applied there in a follow-up change with no new design work needed.

## Migration Plan

No data migration. Both changes are renderer-only UI behavior fixes behind existing components; ship as a normal release. No feature flag needed — rollback is a plain revert if an issue surfaces.
