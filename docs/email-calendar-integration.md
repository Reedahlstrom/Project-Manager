# Email and calendar integration — design notes

Derived from reading Allen Liao's `allen-ea-bot` (Python / Slack / Railway).
None of it ports as code. The patterns below do.

**Sequencing:** this is prompt 8 territory plus new ground. It should not be built
until prompt 4 has been used with real content for 48 hours. Written down now so
the thinking survives.

---

## What Allen's bot actually does

A long-lived process polls Gmail every 3 minutes. Each new message goes through a
cheap model that answers YES/NO plus a one-line reason. A YES posts a Slack alert
to a private channel and auto-creates a task carrying a deep link back to the
Gmail thread. Separately, three scheduled briefs (7:00, 12:00, 16:30 MT) post the
day's calendar and task list. An hourly job re-scans the spam folder through the
same triage, on the theory that Gmail sometimes misfiles a real thread.

---

## Worth taking

### 1. Deterministic short-circuit before the model runs

Allen hardcodes `ALWAYS_ALERT_DOMAINS = ("obra.co", "obrajobs.com", "hubspot.com")`
and returns early without calling the API.

**Cadence version is better, because we have a `people` table.** If the sender
matches a `people.email`, surface it — no model call, no cost, no chance of a
false negative on someone who actually matters. The model only adjudicates
strangers. Advisors, Paul, Heather, and Kylin Brown are never at the mercy of a
classifier.

### 2. Mark-as-seen only after a *successful* triage

```python
try:
    should_alert, reason = triage_email(email)
except Exception:
    continue          # NOT added to _seen_email_ids — retried next cycle
_seen_email_ids.add(email["id"])
```

A transient API error must not permanently swallow an email. This is the
difference between "the tool occasionally lags" and "the tool silently loses
things," which is the one failure mode Cadence exists to prevent.

### 3. Suppress alerts on threads already replied to

`has_user_replied()` walks the thread looking for the user's own address. No
point nagging about something already handled.

Maps directly onto the "Chase these" logic: a `waiting` commitment whose thread
has a reply from the other party is a candidate to auto-clear the follow-up.

### 4. The alert carries a deep link back to the source

`https://mail.google.com/mail/u/0/#inbox/<threadId>` on the created task. One
click from "you should deal with this" to the actual thing. Cheap, and it's what
makes the alert actionable rather than a notification you dismiss.

### 5. Idempotent scheduled sends

`_shown_debriefs` keyed by `(date, slot_index)` so a restart mid-morning doesn't
re-send the 7am brief. **In Cadence this must be a table, not memory** — see
below.

### 6. `search_events_by_attendee`

The sleeper feature. Search the calendar by attendee across a year back and 90
days forward. This is what makes `people.last_contact_at` real instead of
hand-maintained, and it's the backbone of the prompt 6 briefing card — "when did
we last interact with this person" answered from data rather than memory.

### 7. Two-layer defence on model compliance

Allen's clarification reroute has both a system-prompt instruction *and* a
deterministic heuristic safety net, with the comment: "Probabilistic — Claude
sometimes disobeys."

Correct instinct, and it generalises. Anywhere a rule actually matters, the
prompt is the optimisation and the code is the guarantee. In Cadence the
restricted-sensitivity refusal must be enforced in the Edge Function *and* in
RLS, never in the prompt alone.

---

## What NOT to take

### 1. In-memory state

`_seen_email_ids`, `_seen_spam_ids`, `_shown_debriefs` are module-level Python
sets. Fine on Railway, where one process runs for weeks.

**Cadence has no long-lived process.** Supabase Edge Functions are stateless per
invocation and pg_cron fires them fresh each time. Every one of these becomes a
table, or the feature simply does not work — every poll would re-alert on every
email it had ever seen.

Needed: a `processed_messages` table (`external_id`, `source`, `decision`,
`processed_at`) with a unique index on `(source, external_id)`. The insert is the
lock; a conflict means another invocation already handled it.

### 2. Slack as the delivery surface

Allen's entire output layer is Slack Socket Mode. Cadence is a web app behind
Cloudflare Access, and prompt 8 already specifies its surfaces: Paul's view, the
weekly digest, and outbound ICS. Alerts land in `inbox_items` and appear on
Today. Don't bolt on Slack.

### 3. Auto-creating tasks from a model's decision

Allen's bot writes a task row automatically when triage says YES.

Cadence's rule is absolute: nothing an AI proposes is written until a human
accepts it, item by item. **But an email alert is not a violation** — the right
landing zone is `inbox_items`, which is capture, not commitment. Reed triages it
into a real commitment in under five seconds on the Today screen. Same
anti-dropped-ball benefit, rule intact. Prompt 8 already specifies email capture
creating `inbox_items`; this is that feature with a triage step in front.

### 4. Sending message bodies to the model unconditionally

`body[:500]` of every inbound email goes to the API on a 3-minute timer.

For Allen that's recruitment email. For Reed that's potentially First Presidency
correspondence and Angel board-adjacent threads. **Triage should decide on
metadata first** — sender, domain, subject, whether the sender is a known person.
Body text goes to the model only when metadata is genuinely insufficient, and
never for a sender associated with a restricted project.

### 5. The model IDs

`claude-haiku-4-5-20251001` and `claude-sonnet-4-6` are what that repo pins. Pick
current models when we build this rather than copying the constants.

### 6. A 3,998-line `runner.py`

Self-explanatory.

---

## The security question to answer before building any of this

Gmail read access means Cadence can read the entire inbox — including mail about
projects Heather is barred from, and mail that has nothing to do with any of the
five projects.

That OAuth refresh token becomes as sensitive as the service role key, and it
lives in an Edge Function secret. Two decisions needed first:

1. **Scope.** `gmail.readonly` grants the whole mailbox. A narrower design polls a
   dedicated label Reed applies (or a filter routes to), so the integration only
   ever sees mail deliberately put in front of it. Materially smaller blast
   radius, at the cost of Reed maintaining a filter.
2. **What gets stored.** Storing subject and sender is one thing; storing body
   text in `inbox_items.raw_text` puts inbox content permanently in a database
   Heather can read. `inbox_items` is currently private to its creator, which
   covers this — but it's a load-bearing detail, not an accident to preserve by
   luck.

Neither has a default I'd pick without Reed deciding.
