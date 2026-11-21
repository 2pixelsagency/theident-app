# The Ident — Design System

The look is carried over from the website and defined in code by `tokens.css` (colours, fonts, card/upload helpers). Import it once globally and build from the tokens — don't hard-code hex values in components. Add a pointer to this file in `CLAUDE.md` so every session follows it.

## Foundations
- **Fonts:** **Bricolage Grotesque** for display/headings (bold, tight: weight 700, `letter-spacing -0.03em`), **Inter** for body/UI (300–600). Both loaded with `next/font` in `app/layout.tsx`.
- **Palette:** Paper `#F6F4EE` (background) · Ink `#15211C` (text) · **Forest `#123127`** (primary buttons, dark panels) · **Lime `#CBF24C`** (the single punchy accent) · pastels Blossom `#F9D9E6`, Butter `#F4E79A`, Mint `#CDEBD6` for soft fills.
- **Backgrounds:** soft gradients with a fine grain, never flat blobs. Light screens use `bg-glow` (Lime haze → white); dark panels use `bg-hero` (teal-green → deep Forest). Clean white cards on top, a tight radius (`--radius` 12px; inputs and buttons 10px, sheets 14px). No squiggles.
- Class names stay stable (`bg-green` = Forest action colour, `bg-dark` = Forest panel, `bg-green-tint` = Mint…); new utilities `bg-forest`, `bg-lime`, `bg-blossom`, `bg-butter`, `bg-mint`.

## Hard rules
- **Text on Lime is always Ink**, never white. Lime is the accent, not a body-text colour on Paper (too little contrast).
- **On dark panels** (Forest, photo heroes) the green accent automatically becomes Lime (`globals.css`), so icons and rings stay visible.
- **Primary button:** Forest + white text with a neutral shadow — never a coloured glow. Over photos the main button is Lime + Ink.
- **Gradients only with grain:** `bg-glow`, `bg-hero` and the dark photo scrim. Everything else is a solid colour.
- **Uploads** use a dashed outline (`.upload`), not a filled block.
- **Icons:** one consistent set of thin, rounded outline icons. No emojis in the UI.
- **Focus:** every interactive element shows a visible focus ring (Lime on dark, Forest on light).
- Back-chevron headers: center the chevron with the title (flex, `align-items:center`), not on the text baseline.

## Screen direction
- **Talent profile = immersive full-bleed card:** near-full-screen headshot; name in large display type, an "Open to work" status pill and role tag overlaid on a dark bottom scrim; floating primary + secondary actions; a social-proof line; details (showreel, about, skills, credits) scroll below. Reuse the card style for the public profile and a swipeable casting deck.
- **Stateful profile action** by casting relationship: *Invite to audition* (not engaged) → *Recall* (auditioned) → *Make offer / Book* (chosen). Drive it from the application record.
- **Role-aware bottom nav:** performer = Home · Find · Castings · Chats · Profile; caster = Home · Talent · Postings · Chats · Profile. Chosen at onboarding. ("Find" = the job board; don't label the personal pipeline "Roles" — use Castings/Diary.)
- **Dashboard top bar:** "Hi, [name]" greeting with thin outline icons (inbox-with-dot, bell, chat, search).
- **Auth & onboarding:** the Perform / Cast toggle on the photo log-in screen picks the side once. Sign up = create account → one-question-at-a-time onboarding from question 1 → plan → that side's dashboard. Email verification is a soft gate (browse yes; apply/post after verifying).

## Originality
All sample content is fictional (e.g. "Coastlines"). Adapt inspiration, never clone another product's branding or copy.
