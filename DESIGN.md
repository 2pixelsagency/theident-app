# RoleCall — Design System

The look is defined in code by `tokens.css` (colours, fonts, the two allowed gradients, card/upload helpers). Import it once globally and build from the tokens — don't hard-code hex values in components. Add a pointer to this file in `CLAUDE.md` so every session follows it.

## Foundations
- **Fonts:** ITC Symbol for headings (`/public/fonts/ITC-Symbol-Std-Bold.otf`), Poppins 300–500 for body. Headings: weight 400, `letter-spacing -0.02em`, `line-height 1.12`. Page titles ~20px; heroes scale down proportionally.
- **Palette:** bg `#f6f0e2` · ink `#1a1a1a` · muted `#6e6a62` · line `#e7e0d0` · green `#148072` · blue `#1fa5ca` · purple `#b878cc` · pink `#f3c6d7`.

## Hard rules (the owner is specific about these)
- **Minimal bold.** Prefer weight 400–500. Don't bold whole labels for emphasis.
- **No gradients except two:** the purple→pink accent (`--grad-accent`) and the dark hero (`--grad-hero`). Everything else is a solid colour.
- **Dark text on the pink accent gradient** — never white; white washes out on the pale end.
- **Uploads** use a dashed outline (`.upload`), not a filled block.
- **Icons:** one consistent set of thin, rounded, modern outline icons. No emojis anywhere.
- Back-chevron headers: center the chevron with the title (flex, `align-items:center`), not on the text baseline.

## Screen direction
- **Talent profile = immersive full-bleed card:** near-full-screen headshot; name in large display type, an "Open to work" status pill and role tag overlaid on a dark bottom scrim; floating primary + secondary actions; a social-proof line; details (showreel, about, skills, credits) scroll below. Reuse the card style for the public profile and a swipeable casting deck.
- **Stateful profile action** by casting relationship: *Invite to audition* (not engaged) → *Recall* (auditioned) → *Make offer / Book* (chosen). Drive it from the application record.
- **Role-aware bottom nav:** performer = Home · Find · Castings · Chats · Profile; caster = Home · Talent · Postings · Chats · Profile. Chosen at onboarding. ("Find" = the job board; don't label the personal pipeline "Roles" — use Castings/Diary.)
- **Dashboard top bar:** "Hi, [name]" greeting with thin outline icons (inbox-with-dot, bell, chat, search).
- **Onboarding (performer):** role select → straight into a fast, LinkedIn-style profile create → account (Supabase auth) → optional payment. Keep momentum so users don't drop off.

## Originality
All sample content is fictional (e.g. "Coastlines"). Adapt inspiration, never clone another product's branding or copy.
