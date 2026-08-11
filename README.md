# Cadence

A private operating system for the Alta Labs portfolio — Angel Business Advisory
Council, Church Media Fund, Church Jobs Fund, Obra, and Systems & Operations.

Three users: Reed, Paul, Heather. Not a product. Not multi-tenant.

See [`CLAUDE.md`](./CLAUDE.md) for the design and security constitution, and
[`docs/cadence-build-prompts.md`](./docs/cadence-build-prompts.md) for the build
sequence.

---

## Local development

```bash
nvm use             # Node 22
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

Open http://localhost:5173 — it redirects to `/today`.

### Scripts

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Vite dev server on :5173                            |
| `npm run build`     | `tsc -b` then `vite build` → `dist/`                |
| `npm run preview`   | Serve the production build locally                  |
| `npm run typecheck` | Type check without emitting                         |
| `npm run lint`      | ESLint                                              |
| `npm run format`    | Prettier write                                      |
| `npm run db:types`  | Regenerate `src/types/database.ts` from the database |
| `npm run db:push`   | Apply pending migrations                            |

### Environment

Only two variables belong in the frontend, and both are public by design:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Anything prefixed `VITE_` is compiled into the browser bundle and readable by
anyone with devtools. **The Supabase service role key, the Anthropic key, and the
Resend key are server-only** — they live as Supabase Edge Function secrets and must
never appear in `.env.local`, in a `VITE_` variable, or anywhere under `src/`.

If a secret ever lands in a commit, **rotate it**. Deleting the line is not enough;
it stays in the git history.

---

## Deployment — Cloudflare Pages

The repo is connected to Cloudflare Pages via GitHub, so a push to `main` builds and
deploys automatically.

### Build settings

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | None / Vite     |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Root directory         | *(leave blank)* |
| Node version           | `22`            |

Node version is set two ways so they can't drift: `.nvmrc` in the repo root, and a
`NODE_VERSION` environment variable in the Pages project. Set both.

### Environment variables to add in the Pages dashboard

Under **Settings → Environment variables**, add to **both** Production and Preview:

```
VITE_SUPABASE_URL       = https://vgsfqcuhiliazgmjznje.supabase.co
VITE_SUPABASE_ANON_KEY  = sb_publishable_...
NODE_VERSION            = 22
```

The build will succeed without them but the app will throw on load, because
`src/lib/supabase.ts` refuses to construct a client with missing config. That is
deliberate — a silently broken client is worse than a loud one.

### Edge configuration in the repo

- `public/_redirects` — SPA fallback so `/today` and friends resolve.
- `public/_headers` — CSP, HSTS, `frame-ancestors 'none'`, `noindex`, and cache
  policy. The CSP has no `unsafe-inline` in `script-src` because the production
  build contains zero inline scripts. If a dependency ever adds one, fix the
  dependency rather than weakening the policy.

---

## Cloudflare Access — the perimeter

**Do this before putting any real content in the app.** Until Access is on, the
deployment is a public URL.

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** → **Add an
   application** → **Self-hosted**.
2. **Application name:** `Cadence`.
3. **Session duration:** `8 hours`.
4. **Application domain:** the hostname you're serving from — either the
   `*.pages.dev` URL or the custom domain on `altalabsstuff.org`. Add a second
   domain entry if you want both covered; an unprotected `pages.dev` URL alongside a
   protected custom domain defeats the whole thing.
5. Add a policy:
   - **Policy name:** `The three of us`
   - **Action:** `Allow`
   - **Include** → **Emails** → add exactly three addresses:
     - Reed — `<reed@…>`
     - Paul — `<paul@…>`
     - Heather — `<heather@…>`
6. Under **Settings → Authentication**, enable **One-time PIN** at minimum. If the
   three of you are on Google Workspace, add Google as an identity provider and
   require it instead — it's a better experience and a stronger factor.
7. Save.

### Verify it — do not skip this

Open the deployed URL **in a private window**. You must be stopped at the
Cloudflare identity gate *before* any part of the app renders. If you see the
Cadence shell first, Access is not correctly applied — check that the application
domain exactly matches the hostname you loaded, including subdomain.

Then try the `*.pages.dev` URL directly. It must also be gated.

---

## Supabase — manual dashboard steps

Project: `vgsfqcuhiliazgmjznje` ([dashboard](https://supabase.com/dashboard/project/vgsfqcuhiliazgmjznje))

Do these in the dashboard; they aren't expressible as migrations:

1. **Authentication → Sessions** — set session timeout to **8 hours** to match
   Cloudflare Access.
2. **Authentication → Providers** — disable every provider you aren't using. In
   particular, turn off anonymous sign-ins and any open signup. Three accounts get
   created by hand; nobody self-registers.
3. **Authentication → URL Configuration** — set the Site URL to the production
   hostname and add it to the redirect allowlist. Remove `localhost` entries before
   the app holds anything real.
4. **Multi-factor authentication** — enrol all three accounts. Required, not
   optional.
5. **Database → Backups** — turn on **point-in-time recovery**.
6. **Storage** — no buckets yet. When prompt 5 creates one it must be **private**.

### Linking the CLI

```bash
npx supabase login
npx supabase link --project-ref vgsfqcuhiliazgmjznje
npm run db:push
```

---

## Repo layout

```
docs/            build prompts and reference material
public/          static assets, _headers, _redirects, PWA icons
scripts/         one-off generators (icons)
src/
  components/    layout and shared UI
  config/        navigation and static config
  lib/           supabase client, utilities
  routes/        one file per route
  types/         generated database types — do not hand-edit
supabase/
  migrations/    the only record of the schema
```

---

## Status

- [x] **Prompt 1** — foundation, PWA, routing, edge config
- [x] **Prompt 2** — schema and row-level security (`npm run test:rls`, 18 checks passing)
- [ ] Prompt 3 — design system and shell
- [ ] Prompt 4 — commitments and Today

Prompts 5–9 are gated: do not start them until prompt 4 has been used with real
content for at least 48 hours.
