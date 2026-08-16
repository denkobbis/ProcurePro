---
name: ProcurePro
description: Procurement control without the SAP-sized budget — a navy engineering-blueprint system for enterprise procure-to-pay depth.
colors:
  brand-50: "#eff4fc"
  brand-100: "#dce7f8"
  brand-200: "#b8cff0"
  brand-300: "#8cb0e4"
  brand-400: "#5c8bd3"
  brand-500: "#3b69be"
  brand-600: "#2c4f9e"
  brand-700: "#223d7c"
  brand-800: "#1c3163"
  brand-900: "#172750"
  brand-950: "#0e1830"
  accent-50: "#f5f0ff"
  accent-400: "#a06aed"
  accent-500: "#8b3fe0"
  accent-600: "#7827c9"
  accent-700: "#611fa3"
  accent-glow: "#c026d3"
  zinc-canvas: "#fafafa"
  zinc-border: "#e4e4e7"
  zinc-ink: "#18181b"
  white: "#ffffff"
typography:
  headline:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "80px"
components:
  button-primary:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-700}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "#3f3f46"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: ProcurePro

## Overview

**Creative North Star: "The Engineering Blueprint"**

ProcurePro reads as an instrument panel for people who move steel, freight, and money, not a consumer SaaS toy. The system pairs one deep, steady navy (deliberately more industrial than a flat SaaS blue-600, per its own inline comment in `globals.css`) with a mostly neutral, white-and-zinc application body, so the brand color reads as authority and stays legible at table density. Structural grammar — stat strips with trend context, chip filters, alternating feature/screenshot rhythm, dark navy bookend panels — is borrowed honestly from a Behance B2B SaaS dashboard reference, but the reference's own teal identity was explicitly rejected in favor of the existing navy brand (a pinned, user-and-brief-directed choice, not a concept-seed roll).

The build is Restrained-to-Committed: the authenticated app (dashboard tables, forms, lists) stays flat, white, and zinc-neutral so operational data stays scannable; navy is spent deliberately on a small number of "declaration" surfaces — the landing hero, the features-to-trust transition, the pricing section, and the dashboard's welcome banner — where the brand needs to announce itself. Icons are a single hand-drawn stroke set (no external icon library), keeping the whole system in one visual register instead of mixing icon styles. Typography is single-family throughout (Geist Sans for both display and body) — there is no display-face pairing; hierarchy comes from weight and size, not a second font.

**Landing-page pivot (pinned to precoro.com, reviewed live with the user):** the marketing site now carries a violet-to-magenta accent (`accent-50..700`, `accent-glow`) reserved for calls to action, floating annotation badges, and one CTA-only Button variant — never used in the authenticated app, which stays navy/zinc only. The landing page also replaced its real product screenshots with hand-built SVG/React "illustrated mockup" cards (see Components) that dramatize real product figures without photographing the app, and dropped its light/dark toggle in favor of one fixed identity, matching the reference.

Motion is now two authored moments, not one: (1) the landing hero still staggers in on load (`animate-reveal`, 0.7s, custom ease); (2) every later landing section reveals once as it enters the viewport, via a shared `.reveal`/`.reveal-in` IntersectionObserver pattern (`Reveal.tsx`) — one consistent grammar reused everywhere, not a different effect per section. A third, narrower motion "material" — `animate-drift`, a slow 5s float — is reserved for the floating annotation badges on illustrated mockups only. The authenticated app still animates nothing beyond ordinary hover/transition-colors.

**Key Characteristics:**
- Deep navy (brand-950/900) as a rare, declarative surface color; white/zinc as the working default
- Violet-to-magenta accent (landing CTAs, badges, floating annotations only — never the app)
- Single-family typography (Geist Sans) — hierarchy by weight/size, not font pairing
- Hand-drawn stroke icons (1.75px stroke, round caps/joins), never a third-party icon library
- Flat white cards with a hairline border and a soft resting shadow — no heavy elevation
- Tabular numbers on ordered/indexed lists (`tabular-nums`) for the engineering-instrument feel
- Illustrated, hand-built UI mockups on the landing page in place of literal screenshots
- Two authored motion systems (hero reveal, scroll reveal) plus one motion "material" (badge drift) — still not a scattered animation language

## Colors

Deep navy anchored by a wide neutral zinc/white field — the palette is used sparingly and structurally, not decoratively.

### Primary
- **Blueprint Navy** (`--color-brand-600`, #2c4f9e): primary interactive color — primary buttons, active nav/link states, icon tint on chip badges, stat-strip numerals.
- **Blueprint Navy Deep** (`--color-brand-950`, #0e1830): the "declaration" surface — landing hero background, pricing section background, dashboard welcome-banner background. Used on exactly these bookend surfaces, nowhere else.
- **Blueprint Navy Text** (`--color-brand-200`/`--color-brand-300`, #b8cff0 / #8cb0e4): body copy and secondary text set on navy-950 surfaces, where zinc grays would fail contrast.

### Accent (landing page only)
- **Accent Gradient** (`--color-accent-600` → `--color-accent-glow`, #7827c9 → #c026d3): the Button `accent` variant — every primary landing CTA ("Start free trial", "Sign in" submit). Never used in the authenticated app.
- **Accent Badge** (`--color-accent-600`/`--color-accent-glow` solid): floating annotation pills on illustrated mockup cards and the hero/trust photo (e.g. "11 things need a decision").
- **Accent Glow** (`--color-accent-glow` at low opacity, blurred): a soft radial glow behind hero/auth-page dark panels, paired with the existing `.bg-brand-glow`.

### Neutral
- **Canvas White** (#ffffff): default page and card background across the whole app.
- **Zinc Ink** (zinc-900, #18181b): primary heading and body text on light surfaces.
- **Zinc Body** (zinc-500): secondary/description text, muted labels.
- **Zinc Hairline** (zinc-200 / zinc-100): card borders, section dividers, table rules.
- **Zinc Ghost** (zinc-300/400): index numerals, disabled-feeling ornamentation (e.g. the `01`/`02` step counters).

### Named Rules
**The Bookend Rule.** Deep navy (brand-950) is reserved for a small, fixed set of declaration surfaces — landing hero, the features-to-trust photo section, pricing section, dashboard welcome banner, and the login/signup dark panel. Every other application surface (tables, forms, lists, cards) stays on the white/zinc neutral field. Navy is a punctuation mark, not the app's ambient color.

**The Two-Accent Rule** (revised from The Single-Accent Rule). The brand-navy ramp remains the only accent color in the authenticated app. The landing page additionally carries the violet/magenta accent ramp, strictly for calls to action, badges, and floating annotations — never for body text, backgrounds at scale, or anywhere in the app. Semantic states (danger/warning/success) still borrow directly from Tailwind's stock red/amber/green scales in both worlds.

## Typography

**Body/Display Font:** Geist Sans (with Arial, Helvetica, sans-serif fallback)
**Mono Font:** Geist Mono (loaded via `--font-geist-mono`; not used in any sampled UI text — reserved, not yet spent)

**Character:** One typeface family carries the entire hierarchy — display, body, and label are all Geist Sans at different weights and sizes. This is deliberate Operate-mode typography: no serif/sans or grotesk/display pairing, because the product is an operational instrument, not an editorial surface.

### Hierarchy
- **Headline** (600, 2.25–3rem / `text-4xl`–`text-5xl`, leading-[1.1]): landing hero H1 only, set in white on navy-950.
- **Title** (600, 1.875rem / `text-3xl`, tracking-tight): section headers ("One system, the whole purchase lifecycle", pricing H2).
- **Subtitle** (600, 1.5rem / `text-2xl`, tracking-tight): feature-block titles, dashboard card values.
- **Body** (400, 1rem / `text-base`, leading-relaxed): descriptive paragraph copy, capped at `max-w-lg`/`max-w-md` (roughly 55–65ch).
- **Label** (500, 0.875rem / `text-sm`): nav links, button text, stat labels, table headers.
- **Micro-label** (500, 0.75rem / `text-xs`): chip text (industry pills), small badges.

### Named Rules
**The One-Family Rule.** Every text role in the product — hero headline through table cell — is Geist Sans. No second font is introduced for "display" moments; weight (400/500/600) and size carry all hierarchy.

## Layout

Content is capped at `max-w-6xl` (landing page) with `px-4 sm:px-6` gutters, centered via `mx-auto`. Section rhythm on the landing page runs large and even: `py-16`–`py-28` on the hero, `py-20` on standard sections, `space-y-24` between feature blocks. The authenticated app uses a tighter internal rhythm — `space-y-6` between dashboard blocks, `gap-4`/`gap-6` in stat-card grids.

Grids are simple CSS grid, mobile-first: single column collapsing up to `sm:grid-cols-2/3` and `lg:grid-cols-2/3/6` (the six-step workflow strip is the densest grid in the system). Feature sections alternate image/text order left-right (`lg:order-2`) rather than repeating a single fixed layout, borrowed structurally from the Behance case-study reference.

## Elevation & Depth

Hybrid: the app is mostly flat, with a single soft ambient shadow (`shadow-sm`) as the resting state for interactive cards, and a slightly heavier shadow reserved for large hero/feature screenshots and the sticky nav. Depth is not used to indicate stacking order or z-space — it signals "this is a distinct, liftable surface" (cards, stat tiles) versus "this is a flush section" (page background, table zones).

### Shadow Vocabulary
- **Card resting** (`shadow-sm`): default shadow on `StatCard` and content cards at rest.
- **Card hover** (`shadow-md` + `hover:-translate-y-0.5`): stat cards lift slightly and deepen their shadow on hover — the only interactive elevation change in the system.
- **Screenshot frame** (`shadow-lg shadow-zinc-200/60` on light sections; `shadow-2xl shadow-black/40` on the navy hero): product screenshots get a heavier, tinted shadow to read as a framed artifact, distinct from ordinary card shadow.

### Named Rules
**The Lift-on-Hover Rule.** Only genuinely clickable surfaces (StatCard, feature cards where linked) get the hover-lift + shadow-deepen treatment. Static content never adopts it.

## Shapes

- **Standard radius** (`rounded-md`, 6px): buttons, links styled as buttons, focus-ring outline shape.
- **Card/panel radius** (`rounded-lg`, 8px): cards, icon badges, table-adjacent containers, workflow-step tiles.
- **Large surface radius** (`rounded-xl`, 12px): hero/feature screenshot frames, the dashboard welcome banner, the pricing plan panel.
- **Pill radius** (`rounded-full`): industry/category chips only.
- **Borders:** hairline 1px zinc-200 (light surfaces) or `white/10`–`white/20` (navy surfaces) is the default containment device — borders do the separating work more often than shadows do.

## Components

### Buttons
- **Shape:** `rounded-md` (6px), consistent across all sizes.
- **Sizes:** `sm` (px-2.5 py-1, text-xs), `md` (px-4 py-2, text-sm, default), `lg` (px-6 py-3, text-base — reserved for hero/pricing CTAs).
- **Primary:** solid `brand-600` background, white text; hover darkens to `brand-700`.
- **Secondary:** white background, `zinc-300` border, `zinc-700` text; hover fills `zinc-50`.
- **Danger / Success:** solid `red-600`/`green-700`, matching stock-Tailwind semantic hovers — not part of the brand ramp.
- **Ghost:** transparent, `zinc-500` text, hover fills `zinc-100` and darkens text to `zinc-900`.
- **Accent** (landing-page only): `bg-gradient-to-r from-accent-600 to-accent-glow`, white text, soft accent-tinted shadow, hover fades to 90% opacity. Reserved for the landing page's and auth pages' primary CTA — never used inside the authenticated app.
- **Focus:** 2px ring in `brand-500` (app) or `accent-500` (landing page), 1–2px offset, on every interactive element (buttons, nav links) via a shared `focus-visible` utility — never omitted.
- **Disabled:** `opacity-40`, cursor not-allowed.

### Chips
- **Style:** `rounded-full`, `border border-white/15`, `bg-white/5`, `text-brand-200`, `text-xs font-medium` — used only on navy surfaces (landing hero industry pills). No light-surface chip variant exists yet.

### Cards / Containers
- **Corner style:** `rounded-lg` (8px).
- **Background:** white.
- **Border:** `border border-zinc-200`.
- **Shadow:** `shadow-sm` at rest (see Elevation & Depth).
- **Internal padding:** `p-5` (20px) is the standard card padding across StatCard, dashboard quick-actions, and content panels.

### Navigation
- Sticky top nav (`sticky top-0 z-30`), white background at 90% opacity with `backdrop-blur`, hairline `border-b border-zinc-200`. Logo mark + wordmark left; text links (`text-sm font-medium text-zinc-600`, hover `text-zinc-900`) plus a primary CTA button right. No active-state treatment beyond hover on the marketing nav — the authenticated app's nav was not sampled in this pass.

### Stat Card (signature component)
A `StatCard` (icon-tinted square badge + large numeral + label, in a hover-lifting white card) is the repeated primitive for both the landing page's stat strip (untinted, inline numerals on white) and the dashboard's KPI grid (tinted badge, `brand`/`amber`/`green`/`zinc` variants via a `tints` map).

### Illustrated Mockup (landing page, `src/components/landing/mockups.tsx`)
The landing page's feature grid no longer uses product screenshots. Each card's visual is a hand-built SVG/React mockup — real product figures (real PO numbers, real ₦ amounts, a real 8.9% variance the invoice-matching feature actually caught), styled as a miniature UI rather than photographed. Six variants exist (`ListRowsCard`, `StatPlateCard`, `CompareCard`, `ChatExtractCard`, `RuleTableCard`, `MatchPanelCard`, plus the larger `HeroDashboardCard`), all sitting inside a shared `MockupFrame` (a soft brand/accent gradient backdrop, `aspect-[16/12.5]`) with three muted window dots — never full-color traffic-light chrome — as the "this is a window" cue. `FloatingBadge` (accent-gradient pill, `animate-drift`) is the one recurring annotation device, used at most once or twice per composition. Presented in `FeatureCarousel`, a horizontal snap-scroll track with prev/next circular arrow buttons (desktop only; mobile relies on native swipe).

## Do's and Don'ts

### Do:
- **Do** reserve brand-950 navy for the fixed bookend surfaces (hero, pricing, dashboard banner) — see The Bookend Rule.
- **Do** use the hand-drawn stroke icon set (1.75 stroke-width, round caps, no fill) for every icon; never mix in a third-party icon library or a filled/glyph style.
- **Do** use `tabular-nums` on any numbered/indexed list (workflow steps, ranked lists) to keep digits aligned — an established, reused pattern, not a one-off.
- **Do** cap body copy at `max-w-md`/`max-w-lg` (~55–65ch) wherever it appears next to a heading.
- **Do** apply the shared `focus-visible` ring treatment (`ring-2 ring-brand-500 ring-offset-2, rounded-sm`) to every interactive text element and button.

### Don't:
- **Don't** introduce a second display typeface. Geist Sans carries every role; hierarchy is weight/size only.
- **Don't** add shadow or elevation as a stacking signal — it exists only to mark liftable/interactive surfaces (see The Lift-on-Hover Rule).
- **Don't** extend the navy background beyond its fixed bookend surfaces (see The Bookend Rule) — the count grew deliberately once this pass (adding the trust/photo section and the login/signup panel); a further "just this once" addition still needs the same deliberate reasoning, not habit.
- **Don't** use the violet/accent ramp anywhere in the authenticated app, or for anything on the landing page beyond CTAs, badges, and floating annotations — it is a landing-only, action-only color.
- **Don't** animate outside the two authored systems (hero reveal, scroll reveal) plus the one motion material (badge drift); the app's stillness is still deliberate, and the landing page's motion is still a fixed, reused grammar, not scattered effects.
- **Don't** fabricate stat-strip, social-proof, or illustrated-mockup numbers — every stat card and every figure inside an illustrated mockup ties to a real, checkable product fact (a real PO, a real variance, a real approval rule), per PRODUCT.md's no-fabricated-proof commitment.
