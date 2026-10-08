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
- `public/casting-hero.png` — casting side; placeholder portrait until a casting-room / audition shot is supplied.
- Prototype stand-ins also in `public/`: `profile-headshot.png`, `testimonial-1.png`, `testimonial-2.png`, `talent-1.png` … `talent-4.png`. In the app those screens show members' real photos from Supabase, so these aren't wired in.
- Heroes are rendered with `next/image`, so the large uploads are served resized as WebP/AVIF.
  Missing images fall back to the brand hero background.

## 1) Entry flow — the Perform / Cast toggle chooses the side
The toggle is the user choosing their side. Whatever they pick carries through to **both** log in and sign up — the role is never asked again.

- **Log in = the photo screen** (`/welcome`). Full-bleed hero behind the notch, dark scrim, audience banner, the animated Perform / Cast toggle (swaps hero + copy in place), headline + sub, then the login fields over the photo: Email, Password, **Continue**, Forgot password, Apple / Google. "New to RoleCall? **Sign up**" (pink).
- **Sign up = straight into the questions.** No photo/marketing screen and no "which describes you best" chooser — Sign up drops into the onboarding questions for the side picked (`/start/profile`, step 1 of 2 → account, step 2 of 2 → plan).

| Path | Goes to |
|---|---|
| Perform · Log in | talent login (photo) → talent dashboard `/home` |
| Perform · Sign up | performer questions (create profile) → account → plan → `/home` |
| Cast · Log in | casting login (photo) → casting dashboard `/postings` |
| Cast · Sign up | casting questions → account → plan → `/postings` |

Notes
- Logging in on a side switches the account to that side (same as Settings → Using RoleCall as), so the dashboard always matches the toggle. Google / Apple carry the side through `sessionStorage` (`rc-side`).
- `/welcome?side=cast` opens on the casting side (used by Back from sign-up and "Already have an account?").
- `/start?role=performer|caster` jumps into the questions for that side; `/start` with no side goes back to `/welcome`.
- Sign up is one question per screen, starting at question 1, then the account step: performer = name & photo → what you do → base & skills → reel / open to work → account; caster = name & photo → company → what you cast → base → account. Progress shows "1 of 5"…"5 of 5".
- Forgot password: `/forgot-password` (email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`) and `/reset-password` (handles the recovery link — `#access_token…&type=recovery`, `?code=` or `?token_hash=` — then `supabase.auth.updateUser({ password })`). Public anon client only. **Supabase → Authentication → URL Configuration → Redirect URLs must include `<site>/reset-password`**; a recovery link that falls back to the site URL is caught on `/welcome` and sent to the reset page.
- `/login` is a redirect only (old links): `?reset=1` → `/reset-password`, `?forgot=1` → `/forgot-password`, anything else → `/welcome`.

| | Perform | Cast |
|---|---|---|
| Hero | `welcome-hero.webp`, `object-position: 54% center` | `casting-hero.png`, `object-position: center 22%` |
| Banner | Get discovered faster — try RoleCall Pro | Casting a production? — try RoleCall Pro |
| h1 | Your whole career, in one place. | Find your cast, in one place. |
| Sub | Find roles and side hustles, apply with your reel, and track every booking — all in one app. | Post roles, review self-tapes, and book talent — audition to offer, all in one app. |

## 2) Customise profile (edit profile)
Matches the immersive public profile.
- Full-bleed hero with the cover photo (or headshot), bleeding to the top, dark scrim.
- Over the photo: round translucent Cancel (X) top-left; green Save pill top-right (no glow).
- At the foot of the hero: "CUSTOMISE PROFILE" overline, round headshot thumbnail with a green camera badge (tap to replace), "Your headshot" label, frosted Cover button (change background).
- Below, on cream: Name, Headline, Location; Public-profile + Open-to-work toggles; About; Playing details; Skills chips; Showreel & photos (dashed add tile); Credits.

## 3) Perform / Cast toggle animation
Segmented control with a white pill behind the two labels. On switch the pill slides to the selected side and the labels cross-fade (active = ink on white, inactive = white on the translucent track), 400ms ease-out, no bounce. The hero photo, banner, headline and subtext cross-fade over ~280ms at the same time. Both heroes load up front (the first-shown one preloaded, the other eager at low priority) so a switch never shows a blank frame.
Implemented with a CSS transform transition (same result as a Framer Motion `layoutId`, without adding a dependency).
