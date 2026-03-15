# Design Spec — Spavn Publisher Admin

> Reflects the current codebase as of March 2026. Keep this file updated as the design evolves.
> Location: `.spavn/design-spec.md`

## Brand Identity

### Brand Personality
- **Tone**: Quiet confidence — clean, editorial, no visual clutter
- **Feel**: Modern CMS / developer tool — monochrome, utilitarian, content-first
- **Keywords**: minimal, neutral, precise, professional, typographic

### Logo & Assets
- Logo location: Sidebar header — `Box` icon (Lucide) + "Publisher" text
- Logo styling: `font-bold text-lg tracking-tight`
- Brand mark: Lucide `Box` icon in `text-[hsl(var(--primary))]`
- Favicon: Not yet defined
- No color accent — brand identity is typographic, not chromatic

## Color Palette

### Token System
All colors are defined as HSL CSS custom properties in `app/assets/css/main.css` and applied via `hsl(var(--token))` inline classes. The palette is **strictly monochrome** — only `--destructive` carries color saturation.

### Light Mode Tokens
| Token | HSL Value | Approx. | Usage |
|-------|-----------|---------|-------|
| `--background` | `0 0% 96%` | Light gray | Page background |
| `--foreground` | `0 0% 9%` | Near-black | Primary text, headings |
| `--primary` | `0 0% 9%` | Near-black | Active accent border, primary icons |
| `--primary-foreground` | `0 0% 98%` | Near-white | Text on primary surfaces |
| `--secondary` | `0 0% 90%` | Light gray | Secondary backgrounds |
| `--secondary-foreground` | `0 0% 9%` | Near-black | Text on secondary |
| `--muted` | `0 0% 94%` | Soft gray | Empty-state icon backgrounds, subtle fills |
| `--muted-foreground` | `0 0% 45%` | Mid-gray | Secondary text, descriptions, hints |
| `--accent` | `0 0% 94%` | Soft gray | Hover backgrounds, active nav fill, badges |
| `--accent-foreground` | `0 0% 9%` | Near-black | Text on accent surfaces |
| `--destructive` | `0 84% 60%` | Red | Delete buttons, errors, required markers |
| `--destructive-foreground` | `0 0% 98%` | Near-white | Text on destructive surfaces |
| `--card` | `0 0% 100%` | White | Card, sidebar, topbar backgrounds |
| `--card-foreground` | `0 0% 9%` | Near-black | Text on cards |
| `--popover` | `0 0% 100%` | White | Dropdown, tooltip backgrounds |
| `--popover-foreground` | `0 0% 9%` | Near-black | Text in popovers |
| `--border` | `0 0% 90%` | Light gray | All borders |
| `--input` | `0 0% 90%` | Light gray | Input borders |
| `--ring` | `0 0% 9%` | Near-black | Focus rings |
| `--radius` | `1rem` | 16px | Default border radius |

### Dark Mode Tokens
| Token | HSL Value | Approx. |
|-------|-----------|---------|
| `--background` | `0 0% 7%` | Near-black |
| `--foreground` | `0 0% 98%` | Near-white |
| `--primary` | `0 0% 98%` | Near-white |
| `--primary-foreground` | `0 0% 9%` | Near-black |
| `--secondary` | `0 0% 15%` | Dark gray |
| `--secondary-foreground` | `0 0% 98%` | Near-white |
| `--muted` | `0 0% 15%` | Dark gray |
| `--muted-foreground` | `0 0% 64%` | Mid-gray |
| `--accent` | `0 0% 15%` | Dark gray |
| `--accent-foreground` | `0 0% 98%` | Near-white |
| `--destructive` | `0 62% 30%` | Dark red |
| `--destructive-foreground` | `0 0% 98%` | Near-white |
| `--card` | `0 0% 10%` | Very dark gray |
| `--card-foreground` | `0 0% 98%` | Near-white |
| `--popover` | `0 0% 10%` | Very dark gray |
| `--popover-foreground` | `0 0% 98%` | Near-white |
| `--border` | `0 0% 20%` | Dark gray |
| `--input` | `0 0% 20%` | Dark gray |
| `--ring` | `0 0% 83%` | Light gray |

### Dark Mode Implementation
- Managed by `@nuxtjs/color-mode` with `preference: 'system'`, `fallback: 'light'`
- `.dark` class applied to `<html>` — no `dark:` prefix needed for token-based colors
- Toggle in topbar via `Sun`/`Moon` icons

### Semantic Color Patterns
| Meaning | Pattern |
|---------|---------|
| Required field marker | `text-[hsl(var(--destructive))]` on `*` |
| Status dot (active) | `w-2 h-2 rounded-full` + accent background |
| Status dot (inactive) | `w-2 h-2 rounded-full` + destructive background |
| Error state fill | `bg-[hsl(var(--destructive)/0.1)] border-[hsl(var(--destructive)/0.3)]` |
| Feature icon container | `w-10 h-10 rounded-lg bg-[hsl(var(--accent))]` with `text-[hsl(var(--primary))]` icon |

### Known Inconsistencies
- A few components use raw Tailwind colors for success states (`text-green-600`, `bg-green-50 dark:bg-green-950`) instead of tokens. These should be migrated to a `--success` token or removed.

## Typography

### Font Families
- **Sans-serif**: `'Outfit'` — loaded via Google Fonts (weights: 300-800)
- **Monospace**: `'JetBrains Mono'` — loaded via Google Fonts (weights: 400-600)
- **CSS config**: Defined in `@theme` block in `main.css`
- **Font smoothing**: `antialiased` on `body`
- **Base letter-spacing**: `-0.011em` on `body`

### Type Scale
| Level | Classes | Usage |
|-------|---------|-------|
| Page title | `text-2xl font-bold tracking-tight` | Main page headings |
| Section title | `text-lg font-semibold tracking-tight` | Settings headers, card headers |
| Section label | `text-sm font-medium uppercase tracking-wide` | Form section dividers, sidebar section headers |
| Card sub-heading | `text-sm font-medium` or `text-sm font-semibold` | Detail labels, sidebar panels |
| Step heading | `text-base font-semibold` | Multi-step flows (TOTP setup) |
| Body | `text-sm` (14px) | Default text size throughout |
| Small / Caption | `text-xs` | Hints, timestamps, badge text, monospace codes |
| Sidebar section label | `text-[11px] font-medium uppercase tracking-wider` | Sidebar navigation groups |

### Font Weight Usage
| Weight | Class | Usage |
|--------|-------|-------|
| 700 | `font-bold` | Page-level headings only |
| 600 | `font-semibold` | Section titles, card headers, important labels |
| 500 | `font-medium` | Active nav, table emphasis, status text, link text |
| 400 | (default) | Body text, descriptions, form values |

### Monospace Usage
- `font-mono text-sm` — Code editors, slug fields, JSON fields
- `font-mono text-xs` — URLs, tokens, event codes, credential IDs, API keys

## Spacing & Layout

### Base Unit
- **Base**: 4px (Tailwind default)
- **Common scale**: 4, 8, 12, 16, 20, 24, 32, 48

### Admin Layout Structure
```
+------------------+-----------------------------------+
| Sidebar (fixed)  |  Topbar (sticky, z-30)            |
| w-60 (240px)     |  h-14 (56px)                      |
| bg-[--card]      |  bg-[--card] border-b             |
| border-r         |                                   |
|                  +-----------------------------------+
| Logo area h-14   |  Main content                     |
| Nav sections     |  ml-60, p-6                       |
| Version footer   |  <slot />                         |
|                  |                                   |
+------------------+-----------------------------------+
```

- **Sidebar**: Fixed left, `w-60`, `bg-[hsl(var(--card))]`, `border-r`, subtle `shadow-[1px_0_3px_rgba(0,0,0,0.04)]`
- **Topbar**: Sticky, `h-14`, `bg-[hsl(var(--card))]`, `border-b`, `z-30`, subtle `shadow-[0_1px_3px_rgba(0,0,0,0.02)]`
- **Content area**: `ml-60` offset, `p-6` padding
- **Page root**: `min-h-screen bg-[hsl(var(--background))]`

### Content Density
| Context | Spacing |
|---------|---------|
| Between page sections | `space-y-6` |
| Page header to content | `mb-6` |
| Between form groups | `space-y-4` (standard), `space-y-8` (between major sections) |
| Within a field group | `space-y-2` (label, input, error) |
| Between form fields in edit view | `space-y-5` |
| Card internal padding | `p-6` (standard), `p-6 sm:p-8` (settings tabs) |
| Card section with header | `p-6 border-b` header, `p-6` body |
| Two-column form grid | `grid grid-cols-2 gap-4` |
| List items (card lists) | `space-y-3` |
| Button groups | `gap-1` (table), `gap-2` (dialogs), `gap-3` (forms) |
| Sidebar nav items | `px-3 py-2.5`, `gap-2.5` icon-to-text |
| Sidebar section labels | `px-3 pt-6 pb-2` |

## Component Library

### Framework
- **Library**: `@spavn/ui` — shadcn/ui-compatible Vue 3 component library
- **Import style**: Named imports per file (`import { Button, Input } from '@spavn/ui'`)
- **Primitives**: Built on Radix Vue
- **Build config**: Transpiled via `build.transpile: ['@spavn/ui', 'radix-vue']` in nuxt.config

### Component Inventory (48 unique imports)

#### Primitives / Form Controls
`Button`, `Input`, `Textarea`, `Label`, `Switch`, `Checkbox`, `Badge`, `Separator`

#### Select
`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`

#### Dialog (Modal)
`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`

#### Sheet (Slideover)
`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`

#### Table
`Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`

#### Pagination
`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`

#### Tabs
`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

#### Alert
`Alert`, `AlertTitle`, `AlertDescription`

#### Tooltip
`Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`

#### Dropdown Menu
`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`

#### Collapsible
`Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`

#### Card
`Card`, `CardContent`

#### Composables
`useToast`

### Component Patterns

#### Buttons
| Variant | Usage |
|---------|-------|
| `Button` (default) | Primary CTAs, submit buttons |
| `Button variant="outline"` | Secondary actions |
| `Button variant="ghost"` | Tertiary, icon-only, table row actions |
| `Button variant="destructive"` | Delete, remove, danger actions |
| `Button size="sm"` | Table actions, compact contexts |
| `Button size="lg"` | Login CTA, prominent actions |
| `Button class="w-full"` | Full-width block buttons |

#### Cards
Universal card wrapper:
```
rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]
```
Used for: content forms, settings panels, tables, stat cards, sidebar detail sections.

#### Modals (Dialog)
Used for: confirmation dialogs, CRUD forms, pickers. Compound pattern:
```vue
<Dialog v-model:open="open">
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <!-- content -->
    <DialogFooter>
      <Button variant="outline" @click="open = false">Cancel</Button>
      <Button @click="save">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Tables
Used for: user lists, webhook lists, token lists, content lists. Wrapped in card border:
```vue
<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
  <Table>
    <TableHeader><TableRow><TableHead>...</TableHead></TableRow></TableHeader>
    <TableBody><TableRow><TableCell>...</TableCell></TableRow></TableBody>
  </Table>
</div>
```

#### Search Bar
```vue
<div class="relative">
  <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
  <Input v-model="search" placeholder="Search..." class="pl-9" />
</div>
```

#### Empty States
Centered layout: icon (`w-9 h-9`, muted), heading (`text-sm font-medium`), description (`text-sm text-muted-foreground`), optional CTA button below with `mt-4`.

#### Loading States
`Loader2` icon with `animate-spin` — always from Lucide. Centered in container with muted-foreground color. Common pattern: `<Loader2 class="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" />`

#### Settings Component Template
Each settings sub-component follows:
1. Header: title (`text-lg font-semibold tracking-tight`) + description
2. Loading state (centered spinner)
3. Error state (Alert)
4. Form body: `<section class="space-y-4">` blocks separated by `space-y-8`
5. Unsaved changes warning: accent background with `AlertTriangle` icon
6. Actions footer: `flex gap-3 pt-4 border-t` with Cancel + Save buttons

## Iconography

### Library
- **Lucide Vue Next** (`lucide-vue-next`) — 67 unique icons in use
- **Import style**: Named imports per file (`import { Plus, Trash2 } from 'lucide-vue-next'`)
- **Tree-shaking**: Only used icons are bundled

### Size Convention
| Context | Classes | Pixel Size |
|---------|---------|------------|
| Inline (table, label) | `h-4 w-4` | 16px |
| Nav items | `w-5 h-5` | 20px |
| Button icons | `h-5 w-5` | 20px |
| Empty state icons | `w-9 h-9` to `w-10 h-10` | 36-40px |
| Large statement | `h-12 w-12` to `w-16 h-16` | 48-64px |
| Small inline | `h-3 w-3` | 12px |

### Color Convention
- Default/muted: `text-[hsl(var(--muted-foreground))]`
- Destructive: `text-[hsl(var(--destructive))]`
- Primary: `text-[hsl(var(--primary))]`
- Inside buttons: inherit from button variant (no explicit color)

### Loading Spinner
Always `Loader2` with `animate-spin`. Never use other spinner patterns.

## Navigation

### Sidebar Structure
5 named sections:

| Section | Items | Collapsible |
|---------|-------|-------------|
| **Pages** | All Pages | No |
| **Content** | Menus + dynamic content types | Yes (default open) |
| **Assets** | Media Library | No |
| **Types** | Content Types, Block Types, Page Types | Yes (default open) |
| **System** | Users & Roles, API Tokens, Webhooks, Settings | No |

### Sidebar Styling
- Section labels: `text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]`
- Nav items: `px-3 py-2.5 rounded-lg text-sm` with `gap-2.5` between icon and text
- **Active state**: `bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] font-medium` + left border `border-l-[3px] border-[hsl(var(--primary))]`
- **Hover state**: `hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]`
- **Disabled**: `opacity-50 cursor-not-allowed pointer-events-none`
- Collapsible uses `@spavn/ui` `Collapsible` component with `ChevronDown`/`ChevronRight`
- Version footer: `text-xs text-[hsl(var(--muted-foreground))] text-center` with `border-t`

### Topbar
- Breadcrumb: `Home icon > ChevronRight > Page Title`
- Right actions: Theme toggle (`Sun`/`Moon`), Storage status, User dropdown (avatar + name + role)
- Avatar: `w-8 h-8 rounded-full bg-[hsl(var(--accent))]` with initials

### Settings Tabs
Tab-based sub-navigation within `/admin/settings`:
Storage, General, My Preferences, My Security, Email, Security Policies (admin-only).

## Shadows
- **Cards**: None or extremely subtle `shadow-[0_1px_3px_rgba(0,0,0,0.02)]`
- **Sidebar**: `shadow-[1px_0_3px_rgba(0,0,0,0.04)]`
- **Topbar**: `shadow-[0_1px_3px_rgba(0,0,0,0.02)]`
- **Dropdowns/Modals**: Inherited from @spavn/ui defaults
- **Philosophy**: Near-invisible — borders do the heavy lifting for surface separation

## Motion
- **Hover transitions**: `transition-colors duration-150`
- **All transitions**: `transition-all duration-150`
- **Icon transforms**: `transition-transform duration-150` (chevron rotation)
- **Loading spinners**: `animate-spin` on `Loader2`
- **Reduced motion**: Not explicitly implemented — should be added
- **Philosophy**: Subtle, fast (150ms) — functional, not decorative

## Content Edit Layout
Two-column grid for content editing:
```
+-------------------------------+--------------+
| Main form (3 cols)            | Sidebar (1)  |
| FieldRenderer per field       | Actions card |
| space-y-5                     | Booleans     |
|                               | Details card |
+-------------------------------+--------------+
```
- Grid: `grid grid-cols-1 lg:grid-cols-4 gap-6`
- Back button: `Button variant="ghost"` with `ArrowLeft`
- Status indicator: small dot + text (`bg-[hsl(var(--accent))]` for published, muted for draft)

## Do's and Don'ts

### Do
- Use HSL token variables (`hsl(var(--foreground))`) for all colors
- Import @spavn/ui components by name (`import { Button } from '@spavn/ui'`)
- Import Lucide icons by name (`import { Plus } from 'lucide-vue-next'`)
- Use `text-sm` (14px) as the default body text size
- Use `rounded-lg` with `border border-[hsl(var(--border))]` for cards
- Apply `tracking-tight` on headings (`text-2xl`, `text-lg`)
- Keep shadows near-invisible — prefer borders for separation
- Use `space-y-4` within sections, `space-y-6` between sections
- Use `Loader2` with `animate-spin` for all loading spinners
- Maintain the monochrome palette — color should be informational, not decorative

### Don't
- Don't use raw Tailwind color utilities (`text-amber-600`, `bg-stone-200`) — use tokens
- Don't use `text-base` (16px) for body text — this admin uses `text-sm` (14px)
- Don't add heavy shadows — this design is border-driven
- Don't mix icon libraries — Lucide only, no Heroicons
- Don't bypass @spavn/ui components with custom HTML for standard elements
- Don't use `UButton`, `UModal`, or any `U`-prefixed components — those are @nuxt/ui legacy
- Don't use `app.config.ts` for theming — tokens live in `main.css`
- Don't add color accents beyond `--destructive` — the palette is intentionally monochrome
- Don't use inconsistent radius values — `rounded-lg` standard, `rounded-full` for avatars/badges only
