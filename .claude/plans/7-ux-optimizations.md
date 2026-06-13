# 7 UX Optimizations — Implementation Plan

## Overview

| # | Optimization | Complexity | Files Touched |
|---|-------------|-----------|---------------|
| 1 | Apple frosted glass style | 低 | `panel.html`, `TodoPanel.tsx`, `TodoCard.tsx` |
| 2 | Panel resize on pin | 低 | `main/index.ts`, `TodoPanel.tsx`, PetWindow IPC |
| 3 | Pet transparent + hover solidify | 中 | `PetWindow.tsx` (CSS only, no JS changes needed) |
| 4 | Eye tracking | 中 | All 3 pet SVG components |
| 5 | Sidebar + plus button | 高 | `TodoPanel.tsx` (rewrite), new `Sidebar.tsx` |
| 6 | Simplified creation flow | 中 | `TodoInput.tsx` (rewrite), `todoStore.ts` |
| 7 | Completed panel | 中 | `TodoPanel.tsx`, `Sidebar.tsx`, `TodoCard.tsx` |

**Execution order**: 1 → 3 → 4 → 2 → 5+6+7 (the last three are coupled and done together)

**Pet size**: Keep 100×100 (confirmed by user)

---

## Optimization 1 — Apple Frosted Glass Style

### Approach

Pure CSS approach: semi-transparent background + light box-shadow + large border-radius. No system-level backdrop blur. The panel gets a clean, elevated card aesthetic.

### Changes

**`panel.html`** — Set body background to transparent:
```css
body {
  background: transparent;
}
```

**`TodoPanel.tsx`** — Replace the flat `#F5F7FA` color scheme:
- Root container: `background: rgba(255,255,255,0.75)`, `borderRadius: 12px`, `boxShadow: 0 2px 24px rgba(0,0,0,0.08)`
- Header border: lighter `#F0F0F0`

**`TodoCard.tsx`** — Subtle refinements:
- Card background: `white` (keep)
- Card shadow: add `boxShadow: '0 1px 3px rgba(0,0,0,0.04)'`
- Border: `'1px solid #F0F0F0'`

---

## Optimization 3 — Pet Transparent + Hover Solidify

### Current state
Pet is always opaque. No fade transition.

### Target behavior
- **Idle (default):** Pet at `opacity: 0.3` — semi-transparent, quiet presence
- **Hover:** Fade to `opacity: 1` over ~1s (CSS transition `opacity 1s ease-in`)
- **Leave:** Fade back to `opacity: 0.3` over ~0.3s (`opacity 0.3s ease-out`)
- **Dragging:** Instant `opacity: 1` (override transition)

### Implementation

**`PetWindow.tsx`** — All CSS, no JS logic changes needed:
- Root div: add `opacity` state via CSS transition
- Use `isDragging` already available to conditionally apply transition-none class
- Use CSS `:hover` pseudo-class on the container for the fade-in

Actually, since we need the fade on hover of the pet-specific zone, and the container div is 100vw×100vh, we need a more targeted approach:

```css
/* In pet.html or inline */
.pet-container {
  opacity: 0.3;
  transition: opacity 0.3s ease-out;
}
.pet-container:hover {
  opacity: 1;
  transition: opacity 1s ease-in;
}
.pet-container.dragging {
  opacity: 1;
  transition: none;
}
```

**`PetWindow.tsx`** changes:
- Add className `pet-container` to the inner pet div
- Add conditional className when `isDragging`
- Remove `pointerEvents` hack from Bug 3 — not needed (confirmed: 100×100 is fine)

**`pet.html`** — Add the CSS rules above.

### Trade-offs
- CSS hover won't trigger until mouse enters the 100×100 window (with `setIgnoreMouseEvents(false)`). This is fine — the pet area is the interaction surface.

---

## Optimization 4 — Eye Tracking

### Current state
Pet eyes are static SVG shapes, positioned per animation state.

### Target behavior
Eyes follow cursor position on screen. Mouse left → eyes look left, mouse right → eyes right, etc.

### Technical challenge
React component in an Electron renderer needs the cursor's **screen position** relative to the pet window. Options:
1. Global `window.addEventListener('mousemove')` in the renderer
2. IPC from main process to renderer with cursor position
3. `requestAnimationFrame` polling via `electron.screen.getCursorScreenPoint()`

Option 1 is simplest and most performant — the pet window is tiny so we always get mousemove events.

### Implementation

**All 3 pet components** (`tangyuan.tsx`, `cloud.tsx`, `sprite.tsx`):
- Add a `useEffect` with global `mousemove` listener
- On each move, compute: `(e.screenX - windowCenterScreenX, e.screenY - windowCenterScreenY)` via IPC `pet.getPosition()`
- Map dx/dy (clamped to [-40, 40] range) to eye pupil offset
- Pass offset to eye rendering: `cx={baseCx + offsetX}`, `cy={baseCy + offsetY}`
- Cleanup listener on unmount

**`PetWindow.tsx`** — Expose a ref or use a shared store for pet screen position. Actually simpler: each pet SVG component can call `window.electronAPI.pet.getPosition()` once on mount and subscribe to a position-updated event. But even simpler — compute screen position of the pet window by using `e.screenX/Y` from mousemove and comparing to the window's known position.

Simplest approach: 
1. On mount, get pet window position via `electronAPI.pet.getPosition()`
2. On each mousemove: `offsetX = e.screenX - (petScreenX + 50)` (center of pet), clamp to [-20, 20]
3. Apply offset to eye pupils

Store pet screen position in a ref, updated on position change.

---

## Optimization 2 — Panel Resize on Pin

### Current state
Panel is fixed at 340×450px, `resizable: false`.

### Target behavior
- Panel starts at 400×500px (new default)
- When pinned: `resizable: true`, resize handle visible
- When unpinned: `resizable: false`, fixed size, handle hidden
- Unpin → repin: reset to default 400×500px

### Implementation

**`main/index.ts`**:
- `createPanelWindow()`: width=400, height=500, minWidth=280, minHeight=200, resizable=false
- New IPC channel `PANEL_SET_RESIZABLE`: toggles `panelWindow.resizable`
- `PANEL_PIN`: also call `panelWindow.resizable = true`, notify renderer
- `PANEL_UNPIN`: call `panelWindow.resizable = false`, reset size to 400×500
- `updatePanelPosition()`: use `panelWindow.getBounds()` for actual width/height instead of hardcoded values

**`TodoPanel.tsx`**:
- Add resize handle element in bottom-right corner — visible only when pinned
- Handle: a small `◢` icon at `position: absolute; bottom: 0; right: 0`
- The handle itself is purely decorative — BrowserWindow native resize handles the actual resize

**New IPC**: 
- `PANEL_RESIZE`: sender tells main process about resize (not needed — native BrowserWindow resize is transparent)
- Actually, we need the renderer to know the panel is pinned to show/hide the resize handle. We already have the pin state. Pass `pinned` prop to TodoPanel.

Wait — the panel is a SEPARATE window from the pet. The pin state lives in PetWindow. We need to communicate it.

**Approach**: When pin/unpin happens, send an IPC event to the panel renderer:
- `panel:pinStateChanged` event with `{pinned: boolean}`
- In `TodoPanel.tsx`, listen for this event and toggle resize handle visibility

---

## Optimization 5 + 6 + 7 — Sidebar + Simplified Creation + Completed Panel

These three are tightly coupled. The sidebar is the foundation.

### Target layout

```
┌──────────────────────────────────┐
│ Header (title + close)           │
├──────┬───────────────────────────┤
│      │ [Input bar — conditional] │ ← only visible when creating
│ Side │ ───────────────────────── │
│ bar  │ Pinned section            │
│      │ Regular section           │
│      │                           │
│ +  🔔│ (scrollable)              │
│ 📋   │                           │
│ ✅   │                           │
│      │                           │
│ ⚙    │                           │
├──────┴───────────────────────────┤
```

### Sidebar items

| Icon | Label | Count Badge | Action |
|------|-------|------------|--------|
| `+` | New todo | — | Triggers creation input at top |
| `📋` | Active | pinned+regular count | Default view |
| `✅` | Completed | completed count | Shows completed panel |
| `⚙` | Settings | — | Opens settings panel |

### New file: `Sidebar.tsx`

```tsx
// Left sidebar, ~48px wide, vertical icon list
// Props: activeView, onViewChange, counts
// Each icon: centered, 40×40px, rounded, highlight if active
// Badge: small circle with count number
```

### Rewrite: `TodoPanel.tsx`

New states:
- `view: 'active' | 'completed' | 'settings'`
- `creating: boolean` — whether the inline input is visible
- `panelPinned: boolean` — from IPC event

Layout:
- Header (simplified — "桌面小秘书" + close button, much smaller)
- Body (flex row):
  - `Sidebar` (48px fixed width)
  - Main area (flex: 1):
    - Conditional: `InlineInput` when `creating === true`
    - Active view: pinned + regular list (existing)
    - Completed view: new component `CompletedView`
    - Settings view: `SettingsPanel` (already exists)

### Rewrite: `TodoInput.tsx` → `InlineInput.tsx`

New creation flow:
1. User clicks `+` in sidebar → `creating = true`, input auto-focuses
2. User types title
3. First Enter → quadrant mini-floater appears next to input (floating, doesn't cover input)
4. User clicks a quadrant → todo created with that quadrant, input closes
5. User presses Enter again (while floater is visible) → todo created with default quadrant (1), input closes
6. Esc → input closes, content discarded

### New file: `CompletedView.tsx`

- Lists all `completed` todos (from store), sorted by `completedAt` desc
- Each completed card:
  - Title with `text-decoration: line-through`
  - Grayed out (opacity: 0.5)
  - No quadrant dot
  - No action buttons
  - No DDL display
  - Reactivate button (right side, same as current)
- Empty state: "还没有完成任何待办"

### Changes to `TodoCard.tsx`

- Add a **checkbox circle** on the left side (before title)
- Click behavior:
  - If status is 'active': mark complete
  - If status is 'completed' (in completed view): reactivate
- Checkbox: `<div>` styled as circle border, fills with ✓ on click
  - `width: 18px, height: 18px, borderRadius: '50%', border: '2px solid #CCC'`
  - When clicked: fills with quadrant color + white checkmark
- IMPORTANT: checkbox only visible for 'active' cards in the active view. Completed cards in completed view use the reactivate button (or checkbox with gray fill).

Actually, per the spec: "每张待办卡片左侧新增一个圆形勾选框" — so the checkbox is always visible. For active cards it marks complete, for completed cards it reactivates.

### Changes to complete flow

Remove the "保存关联/解除关联" prompt. Simplify:
- Click checkbox → immediate complete (keepLinks=true by default)
- No more popup prompts for completion

This simplifies the existing `completeTodo` flow significantly.

---

## File Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| `panel.html` | Edit | Transparent body background |
| `pet.html` | Edit | Add CSS for pet opacity transition |
| `pet-entry.tsx` | No change | — |
| `panel-entry.tsx` | No change | — |
| `types/index.ts` | Edit | Add `PANEL_RESIZE`, `PANEL_SET_PINNED` IPC channels |
| `preload/index.ts` | Edit | Add new APIs: `panel.setPinned()`, listen `panel:pinState`, add valid channel |
| `main/index.ts` | Edit | Panel default 400×500, min 280×200, `panel:setPinned` → toggle resizable + reset size |
| `PetWindow.tsx` | Edit | Add CSS class for opacity, eye tracking init |
| `TodoPanel.tsx` | **Rewrite** | Sidebar + main area layout, view switching, pinned state listen |
| `Sidebar.tsx` | **New** | Left sidebar with 4 icons + badges |
| `TodoInput.tsx` | **Rewrite** → rename | Becomes `InlineInput.tsx`, new creation flow |
| `TodoCard.tsx` | Edit | Add checkbox circle, remove complete prompt, add completed styling |
| `CompletedView.tsx` | **New** | Completed todos list with strikethrough |
| `tangyuan.tsx` | Edit | Eye tracking logic |
| `cloud.tsx` | Edit | Eye tracking logic |
| `sprite.tsx` | Edit | Eye tracking logic |
| `SettingsPanel.tsx` | No change | — (embedded via sidebar ⚙ icon) |

---

## Data Flow

```
PetWindow (pin state)
  │
  ├─ IPC: panel:show (hover/double-click)
  ├─ IPC: panel:hide (mouse leave / drag start)
  ├─ IPC: panel:setPinned  ←─ main process toggles resizable
  │
  └─ IPC event → panel:pinState  → TodoPanel receives {pinned: bool}

TodoPanel (view state)
  │
  ├─ Sidebar onClick → setView('active'|'completed'|'settings')
  ├─ Sidebar + onClick → setCreating(true)
  ├─ InlineInput onDone → createTodo → setCreating(false)
  └─ TodoCard checkbox → completeTodo(id, true)
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Eye tracking performance (mousemove at 60fps) | Throttle to 30fps via rAF, or use CSS transform instead of React state update |
| Panel resize + position recalculation edge cases | Use `panelWindow.getBounds()` dynamically in `updatePanelPosition()` |
| Sidebar completely changes muscle memory | Keep hover panel trigger unchanged; double-click pin unchanged |
| Removing complete prompt loses "keep links" choice | Simple: default to keepLinks=true. User can manually remove file associations later |
