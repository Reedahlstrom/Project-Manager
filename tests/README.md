# Tests

There are two layers, and they check different things. Run both before trusting a
policy change.

## 1. Local SQL policy checks — fast, no credentials

```bash
./tests/sql/run.sh
```

Boots a throwaway Postgres on port 55432, applies every migration in order, and
exercises the policies directly: Heather against restricted projects, the
restricted cascade, the append-only audit log, and the check constraints.

Needs `brew install postgresql@17`. Nothing else — no Docker, no Supabase
project, no keys. Run it every time you touch `supabase/migrations/`.

**What it does not prove:** it runs against a shimmed `auth` schema where
`auth.uid()` reads a session variable instead of a real JWT. The policy logic is
genuinely exercised; the Supabase auth integration is not.

Current state: **18 checks, all passing.**

## 2. Integration tests against real Supabase — slow, needs accounts

```bash
npm test
```

`rls.test.ts` signs in as real Reed and Heather accounts against a real Supabase
project and asserts the same guarantees end to end. This is the one that would
catch a mistake in how the JWT maps to a profile row.

### Setup

1. Create the three accounts in the Supabase dashboard
   (**Authentication → Users → Add user**), then insert matching `profiles` rows
   with the correct `role` values. The profile row is what grants the role — an
   `auth.users` row on its own has no access to anything.

2. Copy the template and fill it in:

   ```bash
   cp .env.test.example .env.test
   ```

   `.env.test` is gitignored. It contains the **service role key**, which can read
   and write everything and bypasses RLS entirely. Treat it like a password:
   never commit it, never paste it into the frontend, and rotate it if it leaks.

3. Run `npm test`.

The tests create their own fixtures and delete them afterwards. Point them at a
staging project once there is production data worth protecting — they insert and
delete rows in the `projects` table.

### If a test fails

A failing RLS test means confidential material is reachable by someone who
shouldn't reach it. Stop and fix the policy. Do not adjust the test to match the
behaviour.
