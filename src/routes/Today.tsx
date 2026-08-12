import { Inbox, MessageSquareReply, Timer } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page, Section } from '@/components/Page'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

/**
 * Today, structured around the cadence of trust.
 *
 * Capture sits at the very top because receiving the commandment is step one and
 * has to be the fastest thing here.
 *
 * The two chase lists are peers and neither may be buried:
 *   Chase these  — we are waiting on someone else
 *   Report back  — someone else is waiting on us
 *
 * Prompt 4 wires all of this to real data.
 */
export function Today() {
  return (
    <Page title="Today">
      <div className="mb-8">
        <Input
          placeholder="Capture anything…"
          aria-label="Quick capture"
          className="h-11"
          data-capture-field
        />
        <p className="mt-1.5 px-1 t-meta">Press C from anywhere. Enter to file it.</p>
      </div>

      <Section title="Overdue">
        <Card className="p-1">
          <EmptyState compact line="Nothing overdue." />
        </Card>
      </Section>

      <Section title="Due today">
        <Card className="p-1">
          <EmptyState compact line="Nothing due today." />
        </Card>
      </Section>

      <Section title="Chase these">
        <Card className="p-1">
          <EmptyState compact line="Nobody owes you anything right now." />
        </Card>
      </Section>

      <Section title="Report back">
        <Card className="p-1">
          <EmptyState compact line="Every loop is closed." />
        </Card>
      </Section>

      <Section title="Next 7 days">
        <Card className="p-1">
          <EmptyState compact line="No events scheduled." />
        </Card>
      </Section>

      <Section title="Inbox">
        <EmptyState
          icon={Inbox}
          line="Anything you capture lands here until you turn it into a commitment or throw it away."
        />
      </Section>

      {/* Legend for the two mechanisms this screen exists to serve. Removed in
          prompt 4 once real rows make it self-evident. */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Legend
          icon={<Timer className="size-4 text-amber" aria-hidden />}
          title="Chase these"
          line="Waiting on someone else, past the follow-up date. One tap logs a nudge and moves the date."
        />
        <Legend
          icon={<MessageSquareReply className="size-4 text-accent" aria-hidden />}
          title="Report back"
          line="Done, but the person who asked doesn't know yet. Finishing and saying so are two different acts."
        />
      </div>
    </Page>
  )
}

function Legend({
  icon,
  title,
  line,
}: {
  icon: React.ReactNode
  title: string
  line: string
}) {
  return (
    <Card className="p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <span className="t-item">{title}</span>
      </div>
      <p className="text-pretty text-[13px] leading-relaxed text-text-3">{line}</p>
    </Card>
  )
}
