# The Ident — Design System

The look is carried over from the website and defined in code by `tokens.css` (colours, fonts, card/upload helpers). Import it once globally and build from the tokens — don't hard-code hex values in components. Add a pointer to this file in `CLAUDE.md` so every session follows it.

## Foundations
- **Fonts:** **Bricolage Grotesque** for display/headings (bold, tight: weight 700, `letter-spacing -0.03em`), **Inter** for body/UI (300–600). Both loaded with `next/font` in `app/layout.tsx`.
- **Palette:** Paper `#F6F4EE` (background) · Ink `#15211C` (text) · **Forest `#123127`** (primary buttons, dark panels) · **Lime `#CBF24C`** (the single punchy accent) · pastels Blossom `#F9D9E6`, Butter `#F4E79A`, Mint `#CDEBD6` for soft fills.
- **Backgrounds:** soft gradients with a fine grain, never flat blobs. Light screens use `bg-glow` (Lime haze → white); dark panels use `bg-hero` (teal-green → deep Forest). Clean white cards on top, `--radius` 20px; buttons are pills, inputs 14px, sheets 32px. No squiggles.
- Class names stay stable (`bg-green` = Forest action colour, `bg-dark` = Forest panel, `bg-green-tint` = Mint…); new utilities `bg-forest`, `bg-lime`, `bg-blossom`, `bg-butter`, `bg-mint`.

## Website design system (www.theident.me)
The marketing site follows the **Castings section** (approved design, `components/site/castings/`). Build every website page from `components/site/ds.tsx`; don't invent new card styles.
- **Section header:** dot eyebrow (14px, caps, `tracking 0.14em`, Forest) + display H2 (38px → 56px, weight 700, `-0.03em`) on the left; supporting copy (18px, `--muted-strong`) and pill buttons on the right. Stacks on phones. `SectionHeader` / `SectionHead`.
- **Buttons are pills:** `rounded-full`, min height 48px. Forest filled (primary), 1.5px Forest outline (secondary), Lime on dark panels. `Cta` / `Pill`.
- **Feature cards:** Sand `--sand` (#EFECE4) with `--radius-feature` (32px), 28–32px padding. Header = round icon badge + name + Live/New `Tag` + a 44–48px arrow link top-right (`ArrowLink`). One card per row/grid may be Forest for contrast.
- **Panels with a floating screen:** inside a feature card, a 24px-radius panel uses one of `--panel-forest`, `--panel-lime`, `--panel-butter`, `--panel-mint`, with a stripe band (`--stripes-light` / `--stripes-dark`) behind a white card in a translucent frame (`FloatFrame`: 8px padding, 26px outer / 20px inner radius). Use real-looking app UI, not illustrations.
- **Grids:** `repeat(auto-fit, minmax(min(100%, 480px), 1fr))` for large cards, `320px` (or 260–300px) for small ones; 24px gaps; 1200px column.
- **Closing CTA:** `CtaBand` (Forest panel + lime stripes, centred H2, Lime pill + outline-light pill).
- These website panel gradients are allowed in addition to the app's `bg-glow` / `bg-hero`.

## App (app.theident.me) follows the same system
Applied through the shared primitives in `components/rc/ui.tsx`, so screens inherit it:
- Cards: white on Paper, `--radius` 20px, soft shadow, `--line-soft` border. `DarkCard` = Forest panel + lime stripe band.
- Buttons, segmented tabs, search fields and chips are pills; inputs 14px radius with a Forest focus + Lime ring.
- Headings in Bricolage bold (`PageHeader` 24→36px, `SectionTitle` 20px); eyebrows are 12px dot labels in Forest.
- Switches: Forest track with a Lime knob. Progress bars fill Forest. Icon tiles and empty states use round badges.
- Nav: the active tab is a Forest pill with a Lime icon; the desktop rail sits on Sand.

## Hard rules
- **Text on Lime is always Ink**, never white. Lime is the accent, not a body-text colour on Paper (too little contrast).
- **On dark panels** (Forest, photo heroes) the green accent automatically becomes Lime (`globals.css`), so icons and rings stay visible.
- **Primary button:** Forest + white text with a neutral shadow — never a coloured glow. Over photos the main button is Lime + Ink.
- **Gradients:** in the app only `bg-glow`, `bg-hero` and the dark photo scrim. On the website, also the four `--panel-*` gradients and stripe bands (see Website design system). Everything else is a solid colour.
- **Uploads** use a dashed outline (`.upload`), not a filled block.
- **Icons:** one consistent set of thin, rounded outline icons. No emojis in the UI.
- **Focus:** every interactive element shows a visible focus ring (Lime on dark, Forest on light).
- Back-chevron headers: center the chevron with the title (flex, `align-items:center`), not on the text baseline.

## Screen direction
- **Talent profile = immersive full-bleed card:** near-full-screen headshot; name in large display type, an "Open to work" status pill and role tag overlaid on a dark bottom scrim; floating primary + secondary actions; a social-proof line; details (showreel, about, skills, credits) scroll below. Reuse the card style for the public profile and a swipeable casting deck.
- **Stateful profile action** by casting relationship: *Invite to audition* (not engaged) → *Recall* (auditioned) → *Make offer / Book* (chosen). Drive it from the application record.
- **Role-aware bottom nav = see-through frosted floating pill (icons only, shrinks on scroll, sliding Forest highlight):** performer = Home · Find · Castings · Chats · +; caster = Home · Talent · Postings · Chats · +. The + opens a panel of everything else (Profile, Money, Diary, Goals… Settings). Home header: profile picture top-left, notifications bell top-right, animated "Hi, name" greeting. Main tabs have no back arrow; inner screens do. Chosen at onboarding. ("Find" = the job board; don't label the personal pipeline "Roles" — use Castings/Diary.)
- **Dashboard top bar:** "Hi, [name]" greeting with thin outline icons (inbox-with-dot, bell, chat, search).
- **Auth & onboarding:** the Perform / Cast toggle on the photo log-in screen picks the side once. Sign up = create account → one-question-at-a-time onboarding from question 1 → plan → that side's dashboard. Email verification is a soft gate (browse yes; apply/post after verifying).

## Originality
All sample content is fictional (e.g. "Coastlines"). Adapt inspiration, never clone another product's branding or copy.
