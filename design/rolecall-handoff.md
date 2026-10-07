# RoleCall — build hand-off (entry screens + profile)

Source of truth for the entry screen and Customise profile (the Claude Design prototype can't be opened from the repo).

## Design system (applies to everything below)
- Headings: ITC Symbol, weight 400, letter-spacing ~-0.02em.
- Body: Poppins 300–500. Keep bold minimal.
- Palette: cream `#F6F0E2` · ink `#1A1A1A` · primary green `#14B072` (token `--cta`) · pink `#F3C6D7` · blue `#1FA5CA` · purple `#BB78CC`. Card border `#EBE8E2`, muted text `#8A897F`.
- Flat & minimal: no gradients except dark photo scrims (`bg-scrim`), no glows on buttons, no emojis. Dashed outlines for upload/add tiles.
- Primary button: bg `#14B072`, white text, radius 13–15px, soft neutral shadow `0 6px 16px rgba(14,12,10,0.30)` (`shadow-cta`) — never a coloured glow.

## Assets
- `public/welcome-hero.webp` — studio / voiceover photo, Perform side.
- `public/welcome-cast.webp` — casting side; placeholder until a casting-room / audition shot is supplied.
  Missing images fall back to the brand hero background.

## 1) Entry screen — one screen, two sides (Perform / Cast)
One screen (`/welcome`) with a segmented Perform / Cast toggle that swaps hero, copy and button targets in place.
- Full-bleed hero, bleeds behind the notch, `object-fit: cover`, dark bottom-up scrim.
- Top banner (small): audience-specific text + "try RoleCall Pro".
- Segmented toggle, `h1` headline + one line of subtext.
- Primary CTA "Get started" → onboarding / role select. Secondary "Already have an account? Log in" (pink link).

| | Perform | Cast |
|---|---|---|
| Hero | `welcome-hero.webp`, `object-position: 54% center` | casting image, `object-position: center 22%` |
| Banner | Get discovered faster — try RoleCall Pro | Casting a production? — try RoleCall Pro |
| h1 | Your whole career, in one place. | Find your cast, in one place. |
| Sub | Find roles and side hustles, apply with your reel, and track every booking — all in one app. | Post roles, review self-tapes, and book talent — audition to offer, all in one app. |
| Get started | `/start?role=performer` | `/start?role=caster` |
| Log in | `/login?next=/home` | `/login?next=/postings` |

## 2) Customise profile (edit profile)
Matches the immersive public profile.
- Full-bleed hero with the cover photo (or headshot), bleeding to the top, dark scrim.
- Over the photo: round translucent Cancel (X) top-left; green Save pill top-right (no glow).
- At the foot of the hero: "CUSTOMISE PROFILE" overline, round headshot thumbnail with a green camera badge (tap to replace), "Your headshot" label, frosted Cover button (change background).
- Below, on cream: Name, Headline, Location; Public-profile + Open-to-work toggles; About; Playing details; Skills chips; Showreel & photos (dashed add tile); Credits.

## 3) Perform / Cast toggle animation
Segmented control with a white pill behind the two labels. On switch the pill slides to the selected side and the labels cross-fade (active = ink on white, inactive = white on the translucent track), ~0.4s ease-out, no bounce. Hero image, copy and CTA targets cross-fade at the same time.
Implemented with a CSS transform transition (same result as a Framer Motion `layoutId`, without adding a dependency).
