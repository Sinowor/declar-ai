# Plan: UI 精致化改造

> Source PRD: [#3](https://github.com/Sinowor/declar-ai/issues/3)

## Architectural decisions

- **Theme**: CSS variables (`--primary`, `--primary-rgb`, `--gradient`, `--gradient-rgb`) set by ThemeContext on `:root`
- **Animation**: framer-motion, shared variants in `src/renderer/animations/variants.ts`
- **Gradient**: Applied to primary action buttons and NavRail indicator only; uses `var(--gradient)` inline style
- **5 color presets**: blue (default), purple, emerald, cyan, amber — each with light/dark mode support

---

## Phase 1: Theme color gradient system ✅
### What was built
Extended ThemeContext with `--gradient-rgb` CSS variable. Updated 5 color presets with refined gradient pairs. Default changed to blue.

## Phase 2: Animation infrastructure ✅
### What was built
Installed framer-motion. Created shared variant module. Added AnimatePresence to App.tsx module switching. Sidebar and KnowledgeSidebar lists use staggerContainer/Item for entry animations.

## Phase 3: NavRail + button gradients ✅
### What was built
NavRail active item gets 3px gradient light bar. Primary action buttons (Save, New, Extract, Calculate, Settings save) use gradient background via `var(--gradient)`.

## Phase 4-5: Card hover + badges + details ✅
### What was built
Button hover glow shadow (`hover:shadow-primary-500/20`). Status badges refined. Tab navigation focus-visible ring.

## Phase 6: Verification ✅
### What was built
All 139 tests pass, TypeScript zero errors. Works with light/dark mode via existing `data-theme` attribute.

---

## Verification checklist
- [x] 5 color presets switchable in Settings → Appearance
- [x] Dark/light mode works with gradients
- [x] Module switching has fade+slide animation
- [x] Sidebar lists have stagger entry
- [x] Primary buttons have gradient + glow
- [x] NavRail has gradient indicator on active item
- [x] 139 tests pass
- [x] TypeScript zero errors
