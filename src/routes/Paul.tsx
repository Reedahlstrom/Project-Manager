import { NotBuiltYet } from '@/components/NotBuiltYet'
import { Page } from '@/components/Page'

export function Paul() {
  return (
    <Page title="Paul">
      <NotBuiltYet line="Will show the three things only Paul can do this week, decisions waiting on him, and one line of health per project — readable in ninety seconds on a phone." />
    </Page>
  )
}
