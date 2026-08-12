import { FolderKanban } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { Button } from '@/components/ui/Button'

export function Projects() {
  return (
    <Page title="Projects">
      <EmptyState
        icon={FolderKanban}
        line="Five projects live here — Angel BAC, the two Church funds, Obra, and Systems & Operations. Each shows its health, its next event, and what's still open."
        action={
          <Button variant="primary" size="sm" disabled>
            Add a project
          </Button>
        }
      />
    </Page>
  )
}
