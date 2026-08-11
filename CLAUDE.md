# CLAUDE.md — Cadence

> **Reconcile this file.** It was reconstructed from the architecture brief and the
> build prompts, not from the original `cadence-claude-md.md`. Where the original
> says something different, the original wins — merge it in and delete this note.

This file constrains every prompt that follows. Read it fully before starting any
build prompt in `docs/cadence-build-prompts.md`.

---

## What this is

Cadence is a private operating system for the Alta Labs portfolio. Three people use
it: Reed, Paul, and Heather. It is not a product, it will never have a signup page,
and it is not multi-tenant. Every design decision should be made for these three
people specifically.

**The four jobs, in priority order:**

1. One comprehensive picture of every project.
2. Turn meetings into tracked outcomes.
3. Keep Paul accountable.
4. Nothing falls through the cracks.

When two features conflict, the one higher on that list wins.

**The projects:** Angel Business Advisory Council, Church Media Fund, Church Jobs
Fund, Obra, and Systems & Operations.

---

## The standing caution

Building this tool must not displace the work the tool exists to support. The Angel
council being seated matters more than a beautiful app. Prefer the smaller version
that ships today. If a prompt can be satisfied with less code, satisfy it with less
code.

---

## Sensitivity — read this before writing any query

This application holds Church First Presidency material, Angel board-adjacent
notes, and private remarks about named people. Assume every row is more sensitive
than it looks.

Three levels, on `projects`, `people`, `notes`, and `documents`:

- `standard` — all three users read and write.
- `sensitive` — all three users read and write, but the note editor shows the
  "what never goes in here" warning.
- `restricted` — **Reed and Paul only.** Heather cannot read it, cannot write it,
  and must not be able to infer that it exists.

**Restricted cascades.** A note or document belonging to a restricted project is
restricted regardless of its own field. Enforce this inside the RLS policy, not in
application code.

**The security boundary is the RLS policy.** It is not the UI, not a TypeScript
type, and not a `.filter()` in a hook. If a policy is wrong, no amount of correct
frontend code saves it. Every table has RLS enabled and denies by default.

### What must never be stored in this application

- Passwords, API keys, or access tokens of any kind.
- Social security numbers, bank details, or government ID numbers.
- Anything a person shared under an explicit expectation it would not be written
  down.
- Anything that would be materially damaging if the whole database leaked. If you
  find yourself wondering, that is the answer — leave it out.

---

## Users and roles

Three hardcoded roles: `reed`, `paul`, `heather`. There is no role editor and no
permissions UI. A `profiles` row maps `auth.users.id` to a role.

Cloudflare Access sits in front of the entire deployment with three allowlisted
email addresses. Supabase Auth is the second gate. Both are required.

---

## Stack

- Vite + React 19 + TypeScript, strict mode
- Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, dark-only
- TanStack Query for all server state
- react-hook-form + zod for all forms
- Supabase: Postgres, Auth, Storage, Edge Functions, pg_cron
- Cloudflare Pages, behind Cloudflare Access
- PWA via `vite-plugin-pwa`
- Resend for email
- Anthropic API, called **only** from Edge Functions

> The build prompts say React 18. This repo is on React 19 — it is a new
> application and starting a major version behind is debt with no upside.

**No native app. No server beyond Supabase Edge Functions.**

---

## The spine

```
Project → Events → Commitments → People
```

plus `Decisions`, `Notes`, `Documents` hanging off it.

Everything else in the schema serves those seven. If a new table doesn't clearly
support one of the four jobs, don't add it.

### Key mechanisms

- **`follow_up_date` is separate from `due_date`.** This is the single most
  important field in the schema. `due_date` is when a thing is owed; `follow_up_date`
  is when we chase the person who owes it. The "Chase these" section on Today is
  built on it, and it is the anti-dropped-ball feature.
- **A `waiting` commitment must never exist without a `follow_up_date`.** Enforce at
  the database level, not just in the form.
- **`owner_type`** (`me` | `paul` | `heather` | `external`) powers Paul's view.
- **Checklist templates with backdated offsets.** Negative `offset_days` means
  before the event. If an event is created with less lead time than its template
  needs, saying so loudly *is the feature*.
- **The post-event retro** ("what did we forget?") writes back to the template. This
  is how Heather's expertise gets into the system instead of staying in her head.
- **Human-in-the-loop AI extraction.** See below.

---

## AI rules

- The Anthropic API is called **only** from Supabase Edge Functions, using the key
  from the function environment. The key never touches the client.
- Extraction **refuses to run** on any note whose effective sensitivity is
  `restricted`, and says why.
- Every AI response is validated against a zod schema. Malformed output is
  rejected, never coerced.
- **Nothing an AI proposes is written to the database until a human accepts it,
  item by item. There is no "accept all" button.** This rule is absolute.
- Log the call to `audit_log` with the note id and the model. Never log content.

---

## Decided against — do not build these

- End-to-end encryption in v1. It breaks search and extraction, and key loss is a
  worse risk than the threat it defends against.
- Live collaborative editing. Presence indicators only.
- Two-way calendar sync. Outbound read-only ICS only.
- A native app.
- Public share links of any kind.

---

## Design language

Dark only. There is no light theme and no theme toggle.

- Base background near `#0A0B0D`, with four surface steps rising in luminance.
  Elevation is communicated by lightness, never by shadow.
- Three text emphasis levels. All clear 4.5:1.
- **Exactly one accent color**, deliberately outside the green/amber/red range so it
  can never be mistaken for a status. It is used for the primary action, the focus
  ring, and the active nav item — nothing else.
- Muted status colors. Saturated status on dark screams, and if everything screams
  the genuinely urgent stops registering. Overdue is the one thing allowed to be
  loud.
- Inter, with tabular numerals on. Dates and counts sit in columns and must not
  jitter as they change. Prose caps near 70 characters.
- Motion is 150–250ms ease-out, on state changes and things that actually move.
  Nothing decorative. Nothing on page load. Everything wrapped in a
  `prefers-reduced-motion` check.
- Full keyboard operability. Focus states that look deliberate, not default.

All tokens live as CSS variables in `src/index.css`. **Never hardcode a hex value
in a component.**

---

## Code conventions

- `@/` maps to `src/`.
- Named exports everywhere except route components consumed by the router.
- All server state goes through TanStack Query. No `useEffect` fetching.
- Mutations that a human is waiting on are optimistic. Capture and completion must
  feel instant and must never block on the network.
- Dates: store `timestamptz` in UTC, render in the viewer's timezone, and always
  display the zone abbreviation. Events carry an explicit `timezone` column because
  a convening happens in a place.
- Soft delete via `deleted_at`. Never hard-delete anything with history.
- Every Edge Function validates its input with zod before doing anything else, and
  is rate limited.
- Storage buckets are private. File access is via signed URLs with a 60-second
  expiry. There are no public buckets in this project.

---

## Verification

Before saying a prompt is done:

1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. `npm run build` passes.
4. For anything touching RLS: the policy test actually runs and actually passes.
5. For UI: look at it, on a phone width as well as desktop.

Never report done without having run these.
