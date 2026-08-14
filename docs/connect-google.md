# Connecting Gmail and Google Calendar

Everything on this side is built and deployed. What's left is a Google Cloud
project, which only you can create.

Budget about ten minutes.

---

## What the app will be able to do

You chose **full mailbox read** and **Calendar OAuth**, so the scopes are:

| Scope | What it allows |
| --- | --- |
| `gmail.readonly` | Read any message in the mailbox. No sending, no deleting. |
| `calendar.readonly` | Read events and attendees. No writing to your calendar. |

**Be clear-eyed about this.** The refresh token this produces can read every
email in `reed@altalabs.com`, including Church correspondence. It is stored in
`integration_credentials`, a table with row-level security enabled and
**no select policy at all** — no signed-in user can read it from a browser, only
an Edge Function using the service role. That is the strongest available
protection short of not granting the scope, and it is worth knowing it is the
token, not the table, that carries the risk. If it ever leaks, revoke at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) —
that kills it instantly, everywhere.

Two things reduce the blast radius, both already in the code:

- **Message bodies are not sent to the model.** Triage runs on sender and
  subject. Body excerpts are only included if you explicitly set
  `EMAIL_TRIAGE_INCLUDE_BODY=true`, and never for mail routed to a restricted
  project.
- **Nothing becomes a commitment automatically.** Flagged mail lands in the
  inbox for you to triage.

---

## Step 1 — Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a project. Name it `Alta Labs Mega Projects`.
3. **APIs & Services → Library** — enable both:
   - **Gmail API**
   - **Google Calendar API**

## Step 2 — OAuth consent screen

**APIs & Services → OAuth consent screen**

- User type: **Internal** (available because altalabs.com is Google Workspace —
  this is the better option; it means no Google verification review and no
  external users can ever consent).
- App name: `Alta Labs Mega Projects`
- Support email and developer email: `reed@altalabs.com`
- Scopes: you can skip adding them here; the app requests them at runtime.

## Step 3 — OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Cadence Edge Functions`
- **Authorised redirect URI** — exactly this, no trailing slash:

```
https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/google-connect
```

Save. Copy the **Client ID** and **Client secret**.

## Step 4 — Give them to the functions

In a terminal, from the repo:

```bash
npx supabase@2 secrets set \
  GOOGLE_CLIENT_ID='…apps.googleusercontent.com' \
  GOOGLE_CLIENT_SECRET='…' \
  --project-ref vgsfqcuhiliazgmjznje
```

Optionally, to let triage read a short body excerpt (off by default):

```bash
npx supabase@2 secrets set EMAIL_TRIAGE_INCLUDE_BODY=true --project-ref vgsfqcuhiliazgmjznje
```

And an Anthropic key so triage can judge unknown senders. Without it, everything
is surfaced rather than silently dropped — failing toward showing you too much
rather than too little:

```bash
npx supabase@2 secrets set ANTHROPIC_API_KEY='sk-ant-…' --project-ref vgsfqcuhiliazgmjznje
```

## Step 5 — Connect

Open this once in a browser and approve:

```
https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/google-connect?key=SETUP_KEY_HERE
```

Replace `SETUP_KEY_HERE` with the setup key (it was printed when the key was
generated; regenerate any time with
`npx supabase@2 secrets set SETUP_KEY=$(openssl rand -hex 16) --project-ref vgsfqcuhiliazgmjznje`).

You should land on a page saying **Google connected**. The refresh token goes
straight into the database — it is never displayed, and you never paste it
anywhere.

---

## Step 6 — Teach it where things belong

Nothing routes to a project until you say so. In **Settings → Routing rules**,
add rules like:

| Kind | Value | Project | Always flag |
| --- | --- | --- | --- |
| domain | `angel.com` | Angel Business Advisory Council | ✓ |
| sender | `paul@altalabs.com` | Systems & Operations | ✓ |
| keyword | `advisory council` | Angel Business Advisory Council | |
| sender | `kylin.brown@…` | Church Jobs Fund | ✓ |

**Always flag** short-circuits the model entirely — no API call, no latency, and
no chance a classifier decides Paul isn't important today. Use it for every
person who actually matters.

Mail and meetings that match nothing still appear in your inbox; they just
aren't attached to a project. Nothing is dropped for want of a rule.

---

## Step 7 — Run it

Settings has **Sync calendar** and **Check email** buttons. Use those first and
watch what comes back before scheduling anything.

Once you trust it, schedule with pg_cron. Do this only after a manual run
looks right:

```sql
select cron.schedule(
  'sync-calendar', '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://vgsfqcuhiliazgmjznje.supabase.co/functions/v1/sync-calendar',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
     ) $$
);
```

The service key has to come from somewhere the SQL can read — use Supabase Vault
rather than pasting it into a cron definition.

---

## If something goes wrong

**"Google returned no refresh token"** — Google only issues one on first
consent. Remove the app at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions) and
run step 5 again.

**"redirect_uri_mismatch"** — the URI in step 3 must match character for
character, including `https://` and no trailing slash.

**Everything is being flagged** — no `ANTHROPIC_API_KEY` is set, so triage is
surfacing everything by design rather than dropping mail it cannot judge.

Last run time and last error for each integration are shown in Settings, and
stored in `integration_state`.
