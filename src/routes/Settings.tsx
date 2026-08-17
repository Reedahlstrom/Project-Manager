import { CalendarSync, Mail, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Page, Section } from '@/components/Page'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label, Select } from '@/components/ui/Select'
import {
  useDeleteRule,
  useIntegrationState,
  useRoutingRules,
  useRunSync,
  useSaveRule,
  useSyncSchedule,
} from '@/hooks/useIntegrations'
import { useProjects } from '@/hooks/useProjects'
import type { Database } from '@/types/models'

type RuleKind = Database['public']['Enums']['rule_kind']

const KINDS = [
  { value: 'sender', label: 'From this address' },
  { value: 'domain', label: 'From this domain' },
  { value: 'keyword', label: 'Subject or title contains' },
  { value: 'attendee', label: 'This person is on the invite' },
]

export function Settings() {
  const { data: projects = [] } = useProjects()
  const { data: rules = [] } = useRoutingRules()
  const { data: state = [] } = useIntegrationState()
  const save = useSaveRule()
  const remove = useDeleteRule()
  const run = useRunSync()
  const { data: schedule = [] } = useSyncSchedule()

  const [kind, setKind] = useState<RuleKind>('domain')
  const [value, setValue] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [always, setAlways] = useState(true)

  const calendar = state.find((s) => s.provider === 'google_calendar')
  const gmail = state.find((s) => s.provider === 'gmail')

  const canAdd = value.trim() !== '' && projectId

  return (
    <Page title="Settings">
      <Section title="Google">
        <div className="grid gap-3">
          <Connection
            icon={<CalendarSync className="size-4 text-text-3" aria-hidden />}
            name="Calendar"
            lastRun={calendar?.last_run_at ?? null}
            error={calendar?.last_error ?? null}
            busy={run.isPending}
            onRun={() => { run.mutate('sync-calendar') }}
            runLabel="Sync calendar"
            schedule={schedule.find((j) => j.job_name === 'sync-calendar')}
          />
          <Connection
            icon={<Mail className="size-4 text-text-3" aria-hidden />}
            name="Email"
            lastRun={gmail?.last_run_at ?? null}
            error={gmail?.last_error ?? null}
            busy={run.isPending}
            onRun={() => { run.mutate('triage-email') }}
            runLabel="Check email"
            schedule={schedule.find((j) => j.job_name === 'triage-email')}
          />
        </div>
        <p className="mt-2 px-1 t-meta text-pretty">
          Not connected yet? Follow <code>docs/connect-google.md</code>. Flagged mail and
          unmatched meetings land in your inbox on Today — never straight into commitments.
        </p>
      </Section>

      <Section title="Routing rules" count={rules.length}>
        <Card className="mb-3 p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>When</Label>
              <Select
                aria-label="Rule kind"
                value={kind}
                onValueChange={(v) => { setKind(v as RuleKind) }}
                options={KINDS}
              />
            </div>
            <div>
              <Label htmlFor="rule-value">This</Label>
              <Input
                id="rule-value"
                value={value}
                onChange={(e) => { setValue(e.target.value) }}
                placeholder={kind === 'keyword' ? 'advisory council' : 'name@company.com'}
              />
            </div>
            <div>
              <Label>File it under</Label>
              <Select
                aria-label="Project"
                value={projectId}
                onValueChange={setProjectId}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Pick a project"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={always}
                  onChange={(e) => { setAlways(e.target.checked) }}
                  className="size-4 accent-[var(--accent)]"
                />
                Always flag — skip the AI check
              </label>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            disabled={!canAdd || save.isPending}
            onClick={() => {
              if (!projectId) return
              save.mutate(
                { kind, value: value.trim(), project_id: projectId, always },
                { onSuccess: () => { setValue('') } }
              )
            }}
          >
            <Plus />
            Add rule
          </Button>
        </Card>

        {rules.length === 0 ? (
          <p className="px-3 t-meta text-pretty">
            No rules yet, so nothing is filed automatically. Start with the people who always
            matter — Paul, an advisor, Kylin Brown — and tick &ldquo;always flag&rdquo; so a
            classifier never gets a vote on whether they&rsquo;re important.
          </p>
        ) : (
          <Card className="p-1">
            {rules.map((rule) => (
              <Row key={rule.id} className="items-center">
                <div className="min-w-0 flex-1">
                  <p className="t-item truncate">{rule.value}</p>
                  <p className="t-meta truncate">
                    {KINDS.find((k) => k.value === rule.kind)?.label} ·{' '}
                    {projects.find((p) => p.id === rule.project_id)?.name ?? 'Unknown project'}
                  </p>
                </div>
                {rule.always ? <Badge tone="accent">Always</Badge> : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-3"
                  aria-label={`Delete rule for ${rule.value}`}
                  onClick={() => { remove.mutate(rule.id) }}
                >
                  <Trash2 />
                </Button>
              </Row>
            ))}
          </Card>
        )}
      </Section>
    </Page>
  )
}

function Connection({
  icon,
  name,
  lastRun,
  error,
  busy,
  onRun,
  runLabel,
  schedule,
}: {
  icon: React.ReactNode
  name: string
  lastRun: string | null
  error: string | null
  busy: boolean
  onRun: () => void
  runLabel: string
  schedule?: { schedule: string; active: boolean } | undefined
}) {
  // Turn a cron expression into something readable. Only the every-N-minutes
  // shape is used here, so anything else falls back to the raw expression.
  const every = /^\*\/(\d+) \* \* \* \*$/.exec(schedule?.schedule ?? '')?.[1]
  const cadence = schedule?.active
    ? every
      ? `Runs itself every ${every} minutes`
      : `Runs on ${schedule.schedule}`
    : null
  return (
    <Card className="p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {icon}
        <span className="t-item">{name}</span>
        {error ? (
          <Badge tone="red">Last run failed</Badge>
        ) : lastRun ? (
          <Badge tone="green">Working</Badge>
        ) : (
          <Badge>Never run</Badge>
        )}
        <Button variant="secondary" size="sm" className="ml-auto" disabled={busy} onClick={onRun}>
          {busy ? 'Running…' : runLabel}
        </Button>
      </div>
      {cadence ? (
        <p className="mt-1.5 t-meta">{cadence}</p>
      ) : (
        <p className="mt-1.5 text-[13px] text-amber">
          Not scheduled — this only runs when you press the button.
        </p>
      )}
      {lastRun ? (
        <p className="t-meta">Last run {new Date(lastRun).toLocaleString()}</p>
      ) : null}
      {/* The error is shown in full rather than summarised. "Something went
          wrong" on an integration is useless; the Google message usually says
          exactly which secret is missing. */}
      {error ? <p className="mt-1.5 text-pretty text-[13px] text-red">{error}</p> : null}
    </Card>
  )
}
