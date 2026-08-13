import { Users } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Badge } from '@/components/ui/Badge'
import { Card, Row } from '@/components/ui/Card'
import { usePeople } from '@/hooks/useProjects'

export function People() {
  const { data: people = [], isLoading } = usePeople()

  return (
    <Page title="People">
      {isLoading ? (
        <p className="px-1 t-meta">Loading…</p>
      ) : people.length === 0 ? (
        <EmptyState
          icon={Users}
          line="Nobody here yet. This is where advisors, partners and staff live — who they are, how you know them, and what matters to them. It's what every briefing card gets built from. Importing the Angel BAC spreadsheet is the fastest way to fill it."
        />
      ) : (
        <Card className="p-1">
          {people.map((person) => (
            <Row key={person.id} className="items-center">
              <div className="min-w-0 flex-1">
                <p className="t-item truncate">{person.name}</p>
                <p className="t-meta truncate">
                  {[person.title, person.org].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <Badge>{person.relationship}</Badge>
            </Row>
          ))}
        </Card>
      )}
    </Page>
  )
}
