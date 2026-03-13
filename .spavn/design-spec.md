# Design Spec — Spavn Publisher Admin

> Auto-generated from codebase analysis. Keep this file updated as the design evolves.
> Location: `.spavn/design-spec.md`

## Brand Identity

### Brand Personality
- **Tone**: Professional & warm — approachable admin interface with a confident identity
- **Feel**: Modern CMS / Admin panel — clean, utilitarian, content-focused
- **Keywords**: clean, warm, structured, professional, minimal

### Logo & Assets
- Logo location: Sidebar header (text logo "Publisher" with `tracking-tight font-bold`)
- Favicon: not yet defined
- Brand mark usage notes: Amber accent used for brand elements

## Color Palette

### Primary (Amber)
- **Primary**: `amber-600` — CTAs, active states, accent buttons
- **Primary hover**: `amber-700` — hover states on primary elements
- **Primary light** (backgrounds): `amber-50` / `dark:amber-950/20` — selected items, active nav backgrounds
- **Primary dark** (text on light): `amber-700` / `dark:amber-400` — active nav text, accent text

### Neutrals (Stone)
- **Background (page)**: `stone-100` / `dark:stone-950` — root page background
- **Surface (cards, panels)**: `white` / `dark:stone-900` — cards, sidebar, topbar
- **Surface secondary**: `stone-50` / `dark:stone-800` — secondary panels, inset areas
- **Border**: `stone-200` / `dark:stone-800` — standard borders
- **Border emphasis**: `stone-700` / `dark:stone-700` — stronger separation
- **Text primary**: `stone-900` / `dark:stone-100` — headings, body text
- **Text secondary**: `stone-700` / `dark:stone-300` — descriptions, secondary labels
- **Text muted**: `stone-500` / `dark:stone-400` — hints, captions, timestamps
- **Text disabled**: `stone-400` / `dark:stone-500` — disabled elements

### Semantic Colors
- **Success**: Nuxt UI `color="success"` — badges, confirmations
- **Warning**: `amber-600` / `amber-800 dark:amber-200` — shares primary palette
- **Error**: Nuxt UI `color="error"` — destructive buttons, validation errors
- **Info**: Amber-based informational states

### Dark Mode
- Implementation: `colorMode` with `preference: 'system'`, `fallback: 'light'`
- Full `dark:` prefix coverage across all components
- Page bg inverts: `stone-100` → `stone-950`
- Surfaces invert: `white` → `stone-900`
- Text inverts: `stone-900` → `stone-100`
- Borders: `stone-200` → `stone-800`

## Typography

### Font Families
- **Headings**: System font stack (Tailwind default `font-sans`)
- **Body**: System font stack (Tailwind default `font-sans`)
- **Monospace**: Tailwind default `font-mono` (code blocks)
- No custom fonts loaded (@fontsource or Google Fonts)

### Type Scale
| Level | Size | Weight | Tailwind Classes |
|-------|------|--------|-----------------|
| H1 (Page title) | 36px | Bold (700) | `text-4xl font-bold` |
| H2 (Section) | 24px | Semibold (600) | `text-2xl font-semibold` |
| H3 (Card title) | 18px | Semibold (600) | `text-lg font-semibold` |
| H4 (Subsection) | 14px | Semibold (600) | `text-sm font-semibold` |
| Body | 14px | Regular (400) | `text-sm` |
| Small / Caption | 12px | Regular (400) | `text-xs text-stone-500` |
| Nav section label | 11px | Medium (500) | `text-[11px] font-medium uppercase tracking-wider` |

### Rules
- Max 2 font families: sans (all text) + mono (code)
- Max 3 weights: Regular (400), Medium (500), Bold/Semibold (600-700)
- Body text is `text-sm` (14px) throughout — compact admin density
- Logo uses `tracking-tight`, nav labels use `tracking-wider`

## Spacing & Layout

### Base Unit
- **Base**: 4px (Tailwind default)
- **Scale**: 4, 8, 12, 16, 24, 32, 48, 64

### Layout Structure
- **Sidebar**: Fixed left, `w-60` (240px), `z-40`
- **Topbar**: Sticky, `h-14` (56px), `z-30`
- **Content area**: `ml-60` offset, `p-6` padding
- **Content max-width**: `max-w-4xl` for card-based layouts (forms, settings)

### Content Density
- **Target**: Balanced — moderate padding, clear grouping, `text-sm` body
- Section gaps: `space-y-6` / `gap-6`
- Component gaps: `space-y-4` / `gap-4`
- Card padding: `p-4` (compact) to `p-6` (spacious)

## Component Patterns

### Border Radius
- **Cards / Modals**: `rounded-lg` (8px)
- **Buttons / Inputs**: `rounded-lg` (8px) — inherited from Nuxt UI
- **Badges / Avatars**: `rounded-full`
- **Smaller elements**: `rounded-md` (6px)

### Shadows
- **Cards**: `shadow-[0_1px_3px_rgba(0,0,0,0.02)]` — extremely subtle
- **Dropdowns**: Nuxt UI default (shadow-md)
- **Modals**: Nuxt UI default (shadow-lg)
- **Philosophy**: Minimal shadows — borders do the heavy lifting for separation

### Buttons (via Nuxt UI `UButton`)
| Variant | Usage | Props |
|---------|-------|-------|
| Primary | Main CTAs | default color (amber) |
| Secondary | Secondary actions | `variant="outline" color="neutral"` |
| Ghost | Tertiary/compact | `variant="ghost" color="neutral"` |
| Destructive | Delete, remove | `color="error"` |
| Sizes | xs, sm, md (default), lg | `size="xs"` / `size="sm"` / `size="lg"` |
| Full-width | Block buttons | `block` prop |

### Inputs (via Nuxt UI `UInput` + `UFormField`)
- **Height**: Default Nuxt UI (40px), `size="lg"` for larger variants
- **Border**: Inherited from Nuxt UI (stone-200 border)
- **Focus**: Nuxt UI default focus ring (amber-derived)
- **Error**: Nuxt UI validation integration
- **Labels**: Via `UFormField` with `label` prop, placed above input

### Navigation Pattern
- **Type**: Fixed sidebar + sticky topbar
- **Sidebar width**: 240px (`w-60`)
- **Topbar height**: 56px (`h-14`)
- **Active state**: `border-l-[3px] border-amber-500` + `bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400`
- **Hover state**: `hover:bg-stone-100 dark:hover:bg-stone-800`
- **Collapsible sections**: Chevron icon rotates with `transition-transform duration-150`

### Modals & Panels
- **Modals**: `UModal` — confirmation dialogs, pickers (`max-w-4xl` for large)
- **Slideovers**: `USlideover` — detail panels, side editing
- **Cards**: `UCard` — content containers

## Look & Feel

### Overall Aesthetic
Clean, minimal admin interface with generous whitespace. Stone neutrals provide a warm, professional base while amber accents add energy without overwhelming. The design prioritizes content readability and task efficiency over visual flair.

### Motion
- **Hover transitions**: `transition-colors duration-150`
- **All transitions**: `transition-all duration-150`
- **Icon transforms**: `transition-transform duration-150` (chevron rotation)
- **Reduced motion**: Not explicitly implemented yet — should be added
- **Philosophy**: Subtle, fast (150ms) — functional, not decorative

### Iconography
- **Icon library**: Heroicons (via Nuxt UI `UIcon`)
- **Pattern**: `i-heroicons-*` (e.g., `i-heroicons-cube-transparent`)
- **Default size**: `w-5 h-5` (20px) for nav, `w-4 h-4` (16px) for inline
- **Style**: Outline (default Heroicons style)

### Imagery
- **Style**: None — admin-focused, no decorative imagery
- **Placeholders**: Icon-based empty states

## Do's and Don'ts

### Do
- Use `amber-*` exclusively for primary accents and active states
- Use `stone-*` for all neutral colors (text, backgrounds, borders)
- Maintain `text-sm` (14px) as the default body text size
- Use Nuxt UI components (`UButton`, `UInput`, `UFormField`, etc.) for all interactive elements
- Apply `dark:` variants on every color class
- Keep shadows minimal — prefer borders for separation
- Use `rounded-lg` as the standard border radius
- Use `space-y-4` within sections, `space-y-6` between sections

### Don't
- Don't use arbitrary hex colors outside the amber/stone palette
- Don't use `text-base` (16px) for body text — this admin uses `text-sm` (14px)
- Don't mix border radius values inconsistently (stick to `rounded-lg` standard)
- Don't add heavy shadows — this design is border-driven
- Don't bypass Nuxt UI components with custom HTML for standard elements
- Don't use gray/slate/zinc — this project uses `stone` exclusively
