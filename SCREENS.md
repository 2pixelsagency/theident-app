# RoleCall — Screen Specs

The build spec for every screen in the prototype. Use with `DESIGN.md` + `tokens.css` (rules) and a screenshot of the screen (exact look). Mobile-first, 390px wide. "Owner" = `created_by`/`auth.uid()`. Build in this priority order.

---

## Onboarding flow
**Welcome** — dark hero (`--grad-hero`) splash. Logo + "RoleCall", headline "Your whole career, in one place", 3 ticks (Verified jobs / Self-tape & sign / Side hustles). Buttons: Create account (green), Apple + Google (outline), "Already have an account? Log in". *(Login page itself is due a rework — owner to supply examples.)*

**Onboarding (role)** — "What brings you here?" Two big choice cards: **I'm a performer** (find roles & side hustles, apply, track work) and **I'm casting or hiring** (post roles, review, book). This choice sets the **role-aware nav** for the whole app. Continue button. 3-step progress bar.

**CreateProfile** — fast, LinkedIn-style. Dark "Autofill it for me" card = vertical list: Upload your CV / Import from Spotlight or Mandy / Paste a profile link. Then "or add the basics": photo + name, "What do you do?" craft chips, Based in, Skills chips, Add showreel (dashed), Open to work toggle, "Create my profile" CTA. Keep it quick so users don't drop off.

## Performer core
**Main (Dashboard)** — top bar: "Hi, [name]" + thin outline icons (inbox-with-dot, bell, chat, search). "Currently on" block card (active job) with quick actions: Schedule, Cast chat, Log pay, Theatre digs. Active Block progress (purple→pink bar). Quick entries to Find, Roles, Calendar.

**DashboardLive** — dashboard variant while on a contract: countdown ("2 weeks left"), today's schedule, "line up what's next" CTA (solid green), earnings snapshot.

**Roles (→ rename "Castings")** — the performer's pipeline. Horizontal status tabs: Active · Self-tape · Pencilled · Recalls · Booked. Cards per role with status chip + the next action (submit tape by date / recall time / held dates / sign contract). Booked card is dark and links to Contract.

**Calendar** — month grid with coloured dots (self-tape/recall/pencil/booked), then an "Upcoming" agenda list with coloured left bars.

**Blocks / NewBlock** — lightweight "Block" planner (focus periods between jobs). Blocks shows active block + progress; NewBlock creates one (name, dates, goal).

## Finding & applying (performer)
**Find (jobs)** — browse board. Centered segmented toggle **Roles | Side hustles**. Search + filters. Job cards (title, verified tick, company, pay, location, tags). *(Header = the clean back-chevron + title pattern.)*

**FindSide** — same as Find but side-hustle listings; "Post a side hustle" entry (purple→pink card, **dark text**).

**JobDetail** — dark hero banner, job title, verified/shortlisting status, pay, dates, description, requirements chips, casting team, and an Apply CTA.

**Apply** — upload showreel/self-tape (dashed upload), pick materials, sign NDA if required, submit. Error handling + notifies the poster on submit.

**Applied** — success confirmation: solid green check circle, "Application sent!", what happens next.

**Contract** — review + sign a booking contract: scrollable terms, signature, confirm.

## Caster side
**Postings** — "Your postings": list of the caster's jobs with submission counts + applicant avatar pile; Post a job entry (Casting role | Side hustle toggle).

**PostJob** — post a casting role: type chips, title, company, pay (transparent — required), location, dates, description, requirements, NDA toggle, publish.

**PostSide** — post a side hustle: free banner (purple→pink, **dark text**), what/category/pay/where/details, safety note, "Post side hustle" CTA (purple→pink, **dark text**).

**CastingGrid** — casting review: deck/grid of applicant cards → opens the immersive Profile. (Target: swipeable deck of the immersive cards.)

**Profile (talent)** — **immersive full-bleed**: near-full-screen headshot; "Open to work" pill + role tag + big name + playing age/height/location overlaid on a dark scrim; floating actions (primary is **stateful**: Invite to audition → Recall → Make offer/Book; secondary Message); "On N casting shortlists" line; then showreel, about, skills, recent credits below.

## Messaging
**CastChat** — group cast chat thread (production-linked), messages, composer.
**NewChat** — new cast chat: group identity (icon tile + name field, helper beneath), link a production, invited avatars, searchable contact list with select toggles, "Create chat & invite N".
**Messages** — 1:1 message thread.
**Inbox** — notifications list (Today / Earlier), coloured icon chips, unread dots, "Mark all read", filter chips.

## Money
**LogPay (Pay & earnings)** — earnings summary, log a payment, list of payments, link to Tax.
**Tax (Tax & expenses)** — self-assessment summary, expenses (with receipt OCR), tax set-aside progress (purple→pink bar).

## Events / What's on  *(backend now live: `events` + `event_rsvps`)*
**Events** — "What's on" marketplace: type filters (auditions, workshops, talks, webinars, premieres), featured events, event cards (cover, date, venue/online, price). Dark hero cards.
**CreateEvent (Host an event)** — type chips, basics (title, host, cover upload), when & where (date/time, in person/online, venue), tickets (paid toggle, price, spots), details, **"Feature this event"** paid upsell (purple→pink header, **dark text**; £ one-off, `is_featured`), Publish (goes live after review → `status`/`is_published`).

## Profile & account
**MyProfile** — the performer's full public page (Spotlight/Mandy style): hero, up to 4 videos, companies logo marquee, testimonials, credits, skills, gallery.
**EditProfile** — customise: banner + avatar (light circle), name/headline/location, visibility toggles, about, playing details, skills chips, media (reel thumbnail + dashed Add), credits.
**Settings** — account, profile & visibility, notifications, payments, privacy & safety, preferences, help, log out.
**Help** — help & support (FAQs, contact).
**Menu** — app menu / hub linking the above.

---

## Backlog to fold in while building (from DB + brief)
- **Graduate tag** on profiles (flag + school + year) → badge + caster filter.
- **Fair/minimum pay**: required transparent pay field + "Fair pay" badge vs Equity minimums.
- **Account + payment**: Supabase auth + Stripe (onboarding → account → pay).
- **Theatre digs**: admin-curated directory + "Enquire"; host self-listing later.
