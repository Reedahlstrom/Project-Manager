# Cadence — Build Prompts for Claude Code

Run these in order. Each ends with something that works and something you can verify. **Do not run prompt 5 onward until you've used what prompt 4 produced for at least a couple of days.**

## Before you start

1. Create the GitHub repo and clone it.
2. Put `CLAUDE.md` in the root. This is the highest-leverage thing you'll do — it constrains every prompt that follows, so don't skip it.
3. Create a Supabase project (choose a US region) and copy the project URL, anon key, and service role key somewhere safe.
4. Create a Cloudflare account if you don't have one.
5. Get an Anthropic API key and a Resend API key.
6. Open Claude Code in the repo root.

Keep `.env.local` in `.gitignore` from the first commit. If a key ever lands in a commit, rotate it — don't just delete the line.

---

## Prompt 1 — Foundation and the security perimeter

```
Read CLAUDE.md fully before starting.

Set up the project foundation for Cadence.

1. Scaffold Vite + React 18 + TypeScript in strict mode, with React Router,
   Tailwind CSS v4, TanStack Query, react-hook-form, zod, and @supabase/supabase-js.
2. Initialize shadcn/ui with a dark-only configuration. Do not accept its default
   theme colors — set up CSS variables per the design language in CLAUDE.md with a
   base background near #0A0B0D and surfaces that step up in luminance.
3. Set up vite-plugin-pwa: installable, standalone display, dark theme color,
   offline app shell. Generate placeholder icons.
4. Create a typed Supabase client in src/lib/supabase.ts reading VITE_SUPABASE_URL
   and VITE_SUPABASE_ANON_KEY. Add .env.example with those two variables only —
   no secret keys ever go in the frontend.
5. Set up the Supabase CLI with a supabase/ directory and an empty initial migration.
6. Add a src/routes structure with placeholder routes for /today, /paul, /projects,
   /people, /scorecard, and a 404. Add a minimal app shell with sidebar navigation.
7. Configure the build for Cloudflare Pages. Add a README section with the exact
   deploy settings (build command, output directory, node version) and the exact
   steps to configure Cloudflare Access in front of the deployment with three
   allowlisted email addresses.
8. Add ESLint and Prettier with sensible strict settings, and a .gitignore that
   covers .env.local, .env, node_modules, dist, and .supabase.

Do not build any features. Do not create database tables yet. When done, tell me
exactly what I need to do manually in the Cloudflare and Supabase dashboards.
```

**Verify:** `npm run dev` shows the shell. Deploy to Cloudflare Pages, turn on Access with your three emails, then open the URL in a private window and confirm you're stopped at the identity gate before the app loads. Do not proceed until that's true.

---

## Prompt 2 — Schema and row-level security

```
Read CLAUDE.md fully before starting.

Build the complete database schema as a single Supabase migration, with RLS
enabled and deny-by-default policies on every table.

Tables:

- profiles: id (references auth.users), name, role ('reed'|'paul'|'heather'),
  email, avatar_url
- projects: id, name, slug, purpose (one line), status ('active'|'paused'|'closed'),
  health ('green'|'amber'|'red'), health_note, sensitivity
  ('standard'|'sensitive'|'restricted'), sort_order, deleted_at, timestamps
- people: id, name, org, title, email, phone, relationship
  ('principal'|'advisor'|'partner'|'staff'|'external'), how_we_know_them,
  what_matters_to_them, notes, tags text[], last_contact_at, next_touch_at,
  sensitivity, deleted_at, timestamps
- events: id, project_id, title, type ('meeting'|'convening'|'launch'|'deadline'),
  starts_at timestamptz, ends_at timestamptz, timezone text, location,
  virtual_link, status ('planned'|'confirmed'|'done'|'cancelled'), agenda,
  template_id, created_by, deleted_at, timestamps
- event_attendees: event_id, person_id, role ('host'|'attendee'|'speaker'|'optional'),
  rsvp ('unknown'|'yes'|'no'|'tentative')
- commitments: id, project_id, event_id nullable, title, detail,
  owner_type ('me'|'paul'|'heather'|'external'), owner_person_id nullable,
  due_date date, follow_up_date date, status
  ('open'|'waiting'|'blocked'|'done'|'dropped'), blocked_reason,
  source ('manual'|'meeting'|'import'|'email'|'checklist'), source_note_id,
  completed_at, created_by, deleted_at, timestamps
- decisions: id, project_id, event_id, statement, decided_by (person_id),
  decided_at, rationale, reversible boolean, timestamps
- notes: id, project_id, event_id, person_id (all nullable), title, body text,
  author_id, sensitivity, extracted_at, deleted_at, timestamps
- note_versions: id, note_id, body, author_id, created_at (append-only history)
- documents: id, project_id, event_id, name, storage_path, mime, size_bytes,
  uploaded_by, sensitivity, timestamps
- checklist_templates: id, name, event_type, description, timestamps
- checklist_items: id, template_id, title, offset_days integer (negative = before
  the event), owner_type, category, sort_order
- milestones: id, project_id, title, target_date, status
  ('upcoming'|'hit'|'missed'|'moved'), timestamps
- comments: id, parent_type ('commitment'|'event'|'note'), parent_id, author_id,
  body, created_at
- inbox_items: id, raw_text, source ('quick'|'email'|'share'), processed boolean,
  created_by, created_at
- digests: id, period_start, period_end, body, sent_at, recipients text[]
- audit_log: id, actor_id, action, table_name, row_id, at, ip

RLS policy rules:
- All three roles can read and write everything EXCEPT rows where
  sensitivity = 'restricted', which are readable and writable only by users whose
  profile role is 'reed' or 'paul'. Enforce this in the policy itself.
- Restricted enforcement must cascade: a note or document belonging to a
  restricted project is restricted regardless of its own field.
- audit_log has an INSERT policy only. No SELECT for anyone except reed and paul,
  and no UPDATE or DELETE policy at all.
- Enable RLS on every single table including join tables.

Also:
- Add updated_at triggers.
- Add a trigger that writes to audit_log on insert/update/delete of commitments,
  decisions, notes, documents, and projects.
- Add full-text search indexes over notes.body, notes.title, people.name,
  people.notes, and commitments.title.
- Seed five projects: "Angel Business Advisory Council", "Church Media Fund",
  "Church Jobs Fund", "Obra", "Systems & Operations".
- Generate TypeScript types into src/types/database.ts.

Then write a test in a tests/ directory that signs in as a heather-role user and
asserts she cannot read a restricted project, a restricted note, or the audit log.
This test must pass before you tell me you're done.
```

**Verify:** Run the RLS test and watch it pass. Then in the Supabase dashboard, manually create a restricted project and confirm it's invisible to the Heather account. **Do not move on until you've seen that with your own eyes.** This is the one place where trusting the code without checking is genuinely dangerous.

---

## Prompt 3 — Design system and shell

```
Read CLAUDE.md fully before starting. Pay close attention to the design language
section.

Build the visual foundation and app shell. There is no data yet — that's fine and
intentional. Make it beautiful before there's content to hide behind.

1. Define the design tokens as CSS variables: a background near #0A0B0D, four
   surface elevation steps, text at three emphasis levels, one accent color, and
   muted status colors for green/amber/red. Document each token's intended use in
   a comment.
2. Set up the typography scale. Use Inter (or a similarly excellent typeface) with
   tabular numerals enabled for numeric contexts. The scale should have real
   contrast between levels — a page title must be unmistakably a page title.
   Cap prose line length near 70 characters.
3. Build the app shell: a sidebar with the six routes, the current user, and a
   Cmd+K trigger. On mobile it becomes a bottom bar with four primary destinations.
   Generous padding around primary content.
4. Build the Cmd+K command palette using shadcn's command component. For now it
   navigates between routes and has a "quick capture" action. Wire the keyboard
   shortcut globally.
5. Build a reusable EmptyState component: an icon, a line explaining what belongs
   here, and a primary action. Use it on all six placeholder routes with
   route-appropriate copy.
6. Build the core primitives, restyled well beyond shadcn defaults: Button,
   Card/Surface, Badge (for status), Input, Select, DatePicker, Dialog, Sheet,
   Tooltip, and a Toast system.
7. Motion: 150-250ms ease-out transitions on state changes and things that
   actually move. Nothing decorative. Nothing that plays on page load. Wrap all
   motion in a prefers-reduced-motion check.
8. Accessibility: 4.5:1 minimum text contrast, full keyboard operability, and
   focus-visible states that look deliberate rather than default.

Then take a screenshot of the Today route and show it to me.
```

**Verify:** Look at it on your phone, installed as a PWA. If it doesn't feel good empty, it will never feel good full. Iterate here — this is the cheapest possible moment to fix the aesthetic.

---

## Prompt 4 — Commitments and Today

```
Read CLAUDE.md fully before starting.

Build the core loop: capture, assign, complete, follow up. This is the heart of the
application and everything else is downstream of it.

1. Quick capture. A field at the top of Today that accepts one line of text and
   creates an inbox_item on Enter, with no other required fields. Also wire it to
   the Cmd+K palette. It must feel instant — optimistic insert, field clears
   immediately, never blocks on the network.
2. Inbox triage. A compact section on Today listing unprocessed inbox_items. Each
   can be converted to a commitment inline with project, owner, and due date, or
   dismissed. Converting should take under five seconds.
3. Commitment CRUD with a create/edit sheet: title, detail, project, owner_type
   (and person if external), due_date, follow_up_date, status.
4. The Today screen, in this exact order:
   - Overdue (past due, not done) — visually the most urgent thing on screen
   - Due today
   - "Chase these" — commitments with status 'waiting' whose follow_up_date is
     today or earlier. This section is the most important one in the app. It is
     what stops things falling through cracks. Each item shows who we're waiting
     on and how long it's been, and offers a one-click "nudge sent" action that
     pushes follow_up_date forward and logs the nudge.
   - Next 7 days of events, compact
   - Inbox triage
5. Completing a commitment is optimistic and instant, with a satisfying but brief
   transition. Undo via toast for ten seconds.
6. Status changes to 'waiting' should prompt for a follow_up_date, defaulting to
   three business days out. Never allow a 'waiting' commitment to exist without one.
7. Empty states for every section.

Keyboard: 'c' to capture, 'x' to complete the focused item, 'j'/'k' to move
between items, Escape to close anything.
```

**Verify:** Use it for two days. Put real commitments in it. Notice what's annoying and fix that before building anything new. Genuinely — stop here for 48 hours.

---

## Prompt 5 — Projects, events, and people

```
Read CLAUDE.md fully before starting.

Build the three remaining core entities and their detail views.

1. Projects list: five cards showing name, purpose, health with its note, next
   event, open commitment count, and count of overdue items. Editable health and
   health_note inline.
2. Project detail: a timeline strip of milestones and events across the top, then
   tabs for Commitments, Events, People, Notes, Documents. Default to Commitments.
3. Events: create/edit with title, project, type, start and end in an explicit
   timezone, location, virtual link, agenda, attendees. Store timestamptz in UTC,
   render in the viewer's timezone, always display the zone abbreviation.
4. Event detail: agenda, attendees, checklist (placeholder for now), notes
   (placeholder), and status.
5. People directory with search and filter by relationship and tag. Person detail
   shows name, org, title, contact, how_we_know_them, what_matters_to_them, tags,
   last_contact_at, and beneath that: open commitments involving them, events
   they've attended, and notes mentioning them.
6. Documents: upload to a PRIVATE Supabase Storage bucket, scoped by project.
   Access only via signed URLs with a 60-second expiry. Confirm in your output that
   the bucket is private.
7. CSV import with column mapping, supporting people and commitments. This is how
   the first real dataset gets in, so make the mapping step forgiving — allow
   skipping columns, preview the first five rows, and report per-row errors without
   failing the whole import.
8. Global search on Cmd+K across notes, people, commitments, and decisions using
   the full-text indexes. Results grouped by type, keyboard navigable.
```

**Verify:** Import the Angel BAC spreadsheet from your dad. If the importer struggles with real data, fix the importer — that's the whole point of it existing.

---

## Prompt 6 — Checklists and briefings

```
Read CLAUDE.md fully before starting.

Build the two features that make this an operator's tool rather than a task list.

CHECKLIST TEMPLATES

1. Template CRUD. A template has a name, an event type, and items with
   offset_days (negative means before the event), title, owner_type, and category.
2. When creating an event, optionally select a template. On selection, instantiate
   every item as a real commitment with due_date computed as event date +
   offset_days, linked to the event, with source 'checklist'. Skip weekends when
   computing — an item due Saturday should land Friday.
3. Event detail shows its checklist grouped by category with the computed dates,
   and flags anything already overdue at creation time. If an event is created
   with less lead time than the template needs, say so loudly and immediately —
   that warning is the feature.
4. THE RETRO. When an event is marked done, show a short prompt: "What did we
   forget?" Free-text entries become new items on the source template, with the
   offset pre-filled based on when it should have happened. Both Reed and Heather
   can do this. This is how the system gets smarter, so make it feel quick and
   worth doing rather than like a form.
5. Seed three templates with realistic lead times:
   - "Advisory council convening": venue hold -42d, invitations -28d, invitation
     follow-up -21d, agenda draft -14d, pre-read packet sent -7d, materials
     printed -2d, room setup -1d, notes captured +1d, memo drafted +3d,
     thank-you and follow-up sent +5d
   - "Branded swag order": design brief -70d, vendor quotes -63d, art approval
     -56d, order placed -49d, proof approved -42d, production -35d, shipping -14d,
     received and counted -7d
   - "External stakeholder meeting": research attendees -7d, agenda sent -3d,
     briefing reviewed -1d, notes captured +1d, follow-up sent +2d

BRIEFING CARDS

6. On event detail, a Briefing section that assembles for each attendee: name,
   org, title, what_matters_to_them, how_we_know_them, when we last interacted,
   open commitments involving them, and the most recent note mentioning them.
7. A "print briefing" view — clean, readable, one page, works as a PDF via the
   browser. This is what gets read in the car before a meeting.
```

**Verify:** Create a fake convening six weeks out and confirm the system tells you you're already late on swag. That warning firing correctly is worth more than the rest of the feature.

---

## Prompt 7 — Notes and extraction

```
Read CLAUDE.md fully before starting. The human-in-the-loop rule is absolute here.

1. Notes editor: markdown, autosaving. Persist to localStorage on every keystroke
   and sync to the server on a 2-second debounce. If the network drops, nothing is
   lost and the UI says so calmly. On successful sync, append the previous body to
   note_versions.
2. Notes attach to a project, an event, or a person. Show a version history
   sidebar with the ability to view and restore any prior version.
3. Presence: use Supabase Realtime to show "Heather is viewing this note" when
   another user has it open. Do NOT build collaborative editing. If two people save
   within the same window, keep both in note_versions and show a non-blocking
   notice that the note changed underneath them.
4. Comments on notes, commitments, and events using the comments table.
5. EXTRACTION. Build a Supabase Edge Function 'extract-note' that:
   - Takes a note id, verifies the caller's access via RLS-respecting queries
   - REFUSES to run on any note whose effective sensitivity is 'restricted', and
     returns a clear error explaining why
   - Sends the note body plus project context to the Anthropic API using the key
     from the function's environment (never the client)
   - Requests structured output: commitments (title, detail, suggested owner_type,
     suggested owner name, suggested due_date, confidence), decisions (statement,
     decided_by, rationale), people mentioned who aren't yet in the database, and
     open questions
   - Validates the response against a zod schema; rejects malformed output rather
     than coercing it
   - Logs the call to audit_log with the note id and model — never the content
6. THE REVIEW SCREEN. Extraction results appear as a diff-style list. Each proposed
   item can be accepted, edited then accepted, or rejected. Nothing is written to
   the database until the user accepts it. There is no "accept all" button — make
   the user look at each one. Accepted items link back to the source note.
7. After review, generate a draft summary paragraph for the digest and store it on
   the note.
```

**Verify:** Take genuinely messy notes from a real conversation and extract. Check whether the suggested owners and dates are right. If they're consistently wrong in one direction, that's a prompt problem — tune the Edge Function prompt, not the review step.

---

## Prompt 8 — The output layer

```
Read CLAUDE.md fully before starting.

Build the parts other people actually see.

1. PAUL'S VIEW at /paul. One screen, phone-first, readable in 90 seconds:
   - "Three things only you can do this week" — his overdue and due-soon
     commitments, capped at five, most urgent first
   - Decisions awaiting him
   - One line of health per active project, with its health_note
   - Nothing else. No sidebar clutter, no counts, no charts.
   Each item has one action: done, or "talk to Reed about this" which creates a
   commitment for Reed and notifies.

2. WEEKLY DIGEST. A pg_cron job Sunday evening calls an Edge Function that
   composes and emails via Resend, to Reed and Paul:
   - What moved this week, by project
   - What's due next week, split by owner
   - What we're waiting on from others, with how long
   - Decisions made this week
   - Anything at risk — overdue items, amber and red health
   Store every digest in the digests table. The stored record is the receipt of
   what Paul was told and when. Write the email in plain, warm prose — short
   paragraphs, no walls of bullets — and make it readable on a phone.

3. ICS FEEDS. A per-user read-only ICS endpoint (Edge Function, secret token in
   the URL, revocable) publishing all events that user can see. One-way, outbound
   only. Add a settings row with the subscribe URL and instructions for Google
   Calendar and Apple Calendar. Do NOT build two-way sync.

4. EMAIL CAPTURE. An inbound address that creates inbox_items. Use Resend's
   inbound webhook to an Edge Function. Verify the sender is one of the three known
   addresses and reject everything else silently.

5. SCORECARD at /scorecard. Computed, not self-reported:
   - On-time commitment rate for owner_type 'me', this quarter (target 95%)
   - Paul's currently overdue count, with a 12-week trend
   - Median days from event to notes captured (target under 2)
   - Count of 'waiting' commitments past follow_up_date with no nudge logged
     (target 0)
   - Per project: commitments closed this quarter, next milestone, health
   Present as clean numbers with their targets, plus one small sparkline for the
   Paul-overdue trend. No dashboard charts beyond that. Numbers in tabular figures.

6. PWA share target so text shared from the phone becomes an inbox_item.
```

**Verify:** Send yourself a digest manually. Read it on your phone. If you wouldn't want your dad to read it, rewrite the composition prompt until you would.

---

## Prompt 9 — Hardening

```
Read CLAUDE.md fully before starting.

Security and durability review. Be adversarial. Assume I've made mistakes.

1. Audit every RLS policy. For each table, state which roles can select, insert,
   update, and delete, and whether restricted rows are correctly excluded.
   Report anything that is more permissive than CLAUDE.md specifies.
2. Verify no secret key exists anywhere in client code or the built bundle.
   Grep the dist output. Report exactly what is reachable from the browser.
3. Verify every storage bucket is private and every file access path uses a
   short-lived signed URL.
4. Verify audit_log has no update or delete policy and that its triggers fire on
   every intended table.
5. Check that the restricted-cascade rule actually holds: create test data with a
   restricted project containing a standard note, and confirm Heather cannot read
   that note.
6. Add a rate limit to every Edge Function.
7. Verify all Edge Functions validate their input with zod before doing anything.
8. Build an export command: dump every project to structured markdown plus CSVs
   for commitments, people, events, and decisions, into a timestamped folder.
   This is the no-lock-in guarantee and the backup.
9. Confirm session length is 8 hours and MFA is enforced on all three accounts.
10. Write a SECURITY.md documenting the threat model, the controls, and — most
    importantly — a written list of what must never be stored in this application.
11. Add a "what never goes in here" note visible on the note editor for anything
    marked sensitive or restricted.

Then give me a numbered list of everything you found wrong, and a separate list of
the three things you'd most want to improve if we had another day.
```

**Verify:** Turn on Supabase point-in-time recovery in the dashboard. Run the export. Open the exported markdown and confirm it's actually readable by a human who's never seen the app.

---

## After v1

Live in it for a month before writing another line. Keep a running note of friction — not features you want, but moments where the tool got in your way. Those are the real v2 backlog, and they'll be different from anything either of us would guess right now.

Two things worth deliberately revisiting after a month: whether the extraction step earns its complexity, and whether Paul is actually opening his view. If he isn't, the answer is almost certainly to push to him rather than to build him a better screen — a text message with three things beats a beautiful dashboard he never loads.
