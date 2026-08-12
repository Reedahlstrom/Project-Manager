import { Users } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Button } from '@/components/ui/Button'

export function People() {
  return (
    <Page title="People">
      <EmptyState
        icon={Users}
        line="Who they are, how you know them, and what matters to them. This is what every briefing card is built from — so the notes you write here are the ones you'll read in the car."
        action={
          <Button variant="primary" size="sm" disabled>
            Add someone
          </Button>
        }
      />
    </Page>
  )
}
