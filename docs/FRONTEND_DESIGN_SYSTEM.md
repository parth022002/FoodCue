# FoodCue Frontend Design System & UI Architecture

```text
========================================================================================
PROJECT:               FoodCue (Packaged Food Intelligence & Kitchen Management PWA)
DOCUMENT TITLE:        Frontend Design System, Brand Tokens & Component Architecture
DOCUMENT VERSION:      v1.0 (Production Release)
DATE:                  17 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5
BRAND AUTHORITY:       FoodCue Brand Guidelines & Digital Experience Design System v1.0
ACCESSIBILITY:         WCAG 2.2 Level AA Compliant
========================================================================================
```

---

## 1. Executive Summary & Design Principles

The FoodCue Frontend Design System establishes an honest, calm, consumer-grade user experience for understanding packaged-food labels, managing household pantries, and preserving absolute privacy sovereignty.

### Guiding Principles:
1. **Calm, Honest & Restrained:** Avoid excessive alarmism or overwhelming red banners unless direct allergen danger is confirmed. Provide a dedicated "Calm Visual Mode" for anxious users.
2. **Whitespace & Visual Hierarchy:** Clear distinction between primary actions (Scan, Confirm, Add to Kitchen), secondary options (Presets, Filters), and background information.
3. **Local-First Transparency:** Users are always informed that data remains 100% on-device in browser IndexedDB unless they explicitly opt in to multi-device cloud sync.
4. **Zero Forced Accounts:** All local functionality is accessible anonymously without signing up.

---

## 2. Colour Palette & Design Tokens

| Token Name | CSS Variable | Hex Value | Semantic Usage |
|---|---|---|---|
| **Primary Green** | `--color-brand-green` | `#075A35` | Brand logo, primary buttons, active navigation indicators, key headings |
| **Dark Green** | `--color-deep-leaf` | `#06452B` | Button hover states, primary headers, hero cards |
| **Cue Lime** | `--color-brand-lime` | `#72C900` | Restrained accents, reticle scan beams, status indicators |
| **Lime Dark** | `--color-lime-hover` | `#4E9F00` | Lime hover states, secondary highlights |
| **Ink** | `--color-ink` | `#12231B` | Primary body text, modal titles, high-contrast labels |
| **Muted Grey-Green**| `--color-muted` | `#64736B` | Secondary captions, timestamps, placeholder text, hints |
| **White Canvas** | `--color-canvas` | `#FFFFFF` | Card backgrounds, dropdown menus, modal surfaces |
| **Soft Surface** | `--color-surface` | `#F5FAF5` | Page background, input fields, pill badges |
| **Subtle Border** | `--color-border` | `#DCE8DE` | Card outlines, tab dividers, table separators |
| **Information Blue**| `--color-info` | `#149BE8` | Informational callouts, GTIN check-digit confirmations |

---

## 3. Typography Hierarchy

- **Display & Headings:** `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
- **Body & Controls:** `Inter`, system-ui, -apple-system, sans-serif

```css
--font-display: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
--font-body: "Inter", system-ui, -apple-system, sans-serif;
```

### Type Scale:
- **Hero Title (Page Level):** 32px / line-height 1.2 / font-weight 800
- **Section Heading (H2):** 20px–24px / font-weight 800
- **Card Title (H3):** 16.5px–18px / font-weight 700
- **Body Regular:** 14px / line-height 1.6 / font-weight 400
- **Control / Button Label:** 13px–13.5px / font-weight 600 or 700
- **Tiny / Meta Caption:** 11px–12px / font-weight 500

---

## 4. Navigation Architecture

### 4.1 Sticky Desktop Navbar
The top navbar is pinned to `top: 0` with a glassmorphism backdrop blur (`rgba(255, 255, 255, 0.94)`, `backdrop-filter: blur(14px)`):

- **Left Section — Brand Identity:**
  - `FoodCueLogo` SVG vector asset (size 36px) with corner scanner brackets and produce cues.
  - Brand Name: `FoodCue` in Plus Jakarta Sans 800 weight.
  - Tagline: *"Know your food. Manage your kitchen."*
- **Center Section — Core Application Navigation:**
  - Encapsulated pill container housing 5 core feature tabs:
    1. **SmartScan** (`Sparkles` icon)
    2. **My Kitchen** (`Refrigerator` icon)
    3. **Reminders** (`Bell` icon)
    4. **Shopping List** (`ShoppingBag` icon)
    5. **Catalogue** (`BookOpen` icon)
- **Right Section — Account & Privacy Controls:**
  - Status Indicator: `Local` (Stored in IndexedDB).
  - Cloud Sync Indicator: Shows `Cloud Sync` when active.
  - Privacy Button (`Shield` icon, deep link to `/privacy`).
  - **Signed-Out State:** `Sign In` (modal) and `Sign Up` (primary CTA).
  - **Signed-In State:** `OrganizationSwitcher` (Household selector) and Profile Avatar dropdown menu.

### 4.2 Mobile Navigation & Touch-First Layout
- **Mobile Drawer:** Accessible overlay drawer sliding smoothly from the right, containing all primary routes, authentication triggers, and account meta.
- **Mobile Bottom Navigation Bar:** Fixed bottom bar on screens `<= 900px` for instant one-thumb navigation across SmartScan, Kitchen, Reminders, Shopping List, and More.
- **Safe Area Insets:** `main-content-layout` automatically injects `padding-bottom: 84px` on mobile viewports to ensure zero content is obscured by the bottom bar.

---

## 5. Component Patterns

### 5.1 Buttons
- **Primary Button (`.btn-primary`):** Forest green `#075A35` background, white text, 600/700 weight, pill or 8px border-radius.
- **Secondary Button (`.btn-secondary`):** White background, border `#DCE8DE`, text `#12231B`.
- **Outline Button (`.btn-outline`):** Transparent background with green/brand border.
- **Danger Action (`.btn-danger-confirm`):** Red background `#B42318`, white text, reserved for permanent data erasure.

### 5.2 Cards & Surface Containers
- Rounded corners (`border-radius: 18px` to `20px`).
- 1px solid border (`#DCE8DE`).
- Soft multi-layer drop shadow (`0 2px 8px rgba(18, 35, 27, 0.04)`).

### 5.3 Allergen & Dietary Chips
- Toggleable selection chips with checkmark indicators.
- **Allergen Alert:** `#FFF1F0` background, `#FFA39E` border, `#CF1322` text.
- **Ingredient Alert:** `#FFFBE6` background, `#FFE58F` border, `#D48806` text.

---

## 6. Responsive Breakpoints

| Breakpoint | Target Device Category | Layout Adaptations |
|---|---|---|
| `< 480px` | Small Smartphones (iPhone SE, Galaxy A) | Bottom bar active; single-column footer; compact auth pill buttons |
| `481px – 768px` | Large Smartphones & Phablets | 2-column footer grid; full-width privacy hero; bottom bar active |
| `769px – 900px` | Mini Tablets / Split Screens | Bottom bar active; desktop center nav concealed into drawer |
| `901px – 1024px` | Tablets & Small Laptops | Desktop navbar active; 3-column footer |
| `> 1024px` | Desktop & Widescreen Monitors | Full 4-column footer; expanded center navigation; full tagline |

---

## 7. Accessibility (WCAG 2.2 AA)

1. **Focus Rings:** Distinct `:focus-visible` outline (`2px solid #075A35`, `outline-offset: 2px`) across all interactive buttons, inputs, and links.
2. **Contrast Ratios:** Forest green (`#075A35`) on white canvas yields `7.8:1` contrast (exceeds AAA requirement of 7:1 for normal text).
3. **Keyboard Operability:** All modals, dropdowns, and mobile drawers close with the `Escape` key and support full keyboard tab cycling.
4. **Screen-Reader Labels:** Non-text buttons (torch, mobile hamburger, camera flips) carry explicit `aria-label` and `aria-expanded` attributes.
