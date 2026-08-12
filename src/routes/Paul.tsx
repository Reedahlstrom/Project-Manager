import { UserRoundCheck } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'

export function Paul() {
  return (
    <Page title="Paul">
      <EmptyState
        icon={UserRoundCheck}
        line="The three things only Paul can do this week, decisions waiting on him, and one line of health per project. Nothing else — it has to be readable in ninety seconds on a phone."
      />
    </Page>
  )
}
