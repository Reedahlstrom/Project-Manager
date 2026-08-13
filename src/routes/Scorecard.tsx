import { NotBuiltYet } from '@/components/NotBuiltYet'
import { Page } from '@/components/Page'

export function Scorecard() {
  return (
    <Page title="Scorecard">
      <NotBuiltYet line="Will compute your on-time rate, how fast you close loops, Paul's overdue count, and anything left waiting past its follow-up. Computed from the data, never self-reported — it needs a few weeks of real use before the numbers mean anything." />
    </Page>
  )
}
