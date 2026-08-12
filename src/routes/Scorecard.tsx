import { Gauge } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'

export function Scorecard() {
  return (
    <Page title="Scorecard">
      <EmptyState
        icon={Gauge}
        line="Computed, never self-reported. On-time rate, how fast you close loops, Paul's overdue count, and anything left waiting past its follow-up. These are the numbers that make the quarterly markers real."
      />
    </Page>
  )
}
