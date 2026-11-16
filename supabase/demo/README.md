# App Store demo scenario ("robots")

Seeded directly in the live Supabase project on 16 Nov 2026. Everything is tagged so it can be removed in one go.

- **21 accounts** at `@demo.theident.me`, `profiles.is_demo = true`, email confirmed + verified
  - `review@demo.theident.me` — Alex Morgan, performer (for Apple's reviewer): applications at every stage
    (self-tape due, recall, pencilled, booked), cast chats, a casting DM, connections, to-dos, a saved role
  - `robot-p01` … `robot-p15@demo.theident.me` — performers with headshots, reels, credits, skills, logos, testimonials
  - `robot-c01` … `robot-c05@demo.theident.me` — verified casting directors
- **20 demo jobs** (`jobs.is_demo`), shown with a "Demo" tag; real users can't apply (RLS) and they never trigger
  "New role for you" alerts for real performers
- **32 applications** with reels, ratings and private notes; booking created the production cast chats
- **Cast chats**: "Mrs Doubtfire — company" and "SAS: Rogue Heroes — rehearsals" (+ two from bookings)

All demo accounts share one password; it is not stored in the repo (ask the owner).
IDs are `md5('theident-demo:' || key)::uuid`, e.g. key `review`, `p01`, `c01`, `j01`, `chat-doubtfire`.

Remove everything: run `remove_demo.sql` in the Supabase SQL editor.
