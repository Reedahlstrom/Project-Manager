import { ExternalLink, MapPin, Plus, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Page } from '@/components/Page'
import { PlaybookSheet } from '@/components/playbook/PlaybookSheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useCategories, usePlaybook, useSetGoTo } from '@/hooks/usePlaybook'
import type { PlaybookEntry } from '@/hooks/usePlaybook'
import { cn } from '@/lib/utils'

/**
 * Ball knowledge — the things you'd otherwise have to ask, or work out again
 * every time.
 *
 * Built for lookup under time pressure, not for browsing: grouped by kind,
 * go-to first and starred, and one search box that matches everything. You
 * should be able to answer "where do we take him for lunch in American Fork"
 * before the sentence is finished.
 */
export function Playbook() {
  const { data: entries = [], isLoading } = usePlaybook()
  const categories = useCategories(entries)
  const setGoTo = useSetGoTo()

  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PlaybookEntry | undefined>(undefined)
  const [seedCategory, setSeedCategory] = useState<string | undefined>(undefined)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) =>
      [e.name, e.note, e.area, e.category, e.who]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    )
  }, [entries, query])

  const grouped = useMemo(() => {
    const map = new Map<string, PlaybookEntry[]>()
    for (const e of filtered) {
      const list = map.get(e.category) ?? []
      list.push(e)
      map.set(e.category, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  function add(category?: string) {
    setEditing(undefined)
    setSeedCategory(category)
    setSheetOpen(true)
  }

  return (
    <Page
      title="Ball knowledge"
      action={
        <Button variant="primary" size="sm" onClick={() => { add() }}>
          <Plus />
          Add
        </Button>
      }
    >
      {entries.length > 0 ? (
        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder="Search everything…"
            aria-label="Search ball knowledge"
            className="h-11 pl-9"
          />
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-1 t-meta">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Star}
          line="Where he takes people, what he sends as a thank-you, which events he actually turns up to. Anything you'd otherwise have to ask twice."
          action={
            <Button variant="primary" size="sm" onClick={() => { add() }}>
              <Plus />
              Add the first one
            </Button>
          }
        />
      ) : grouped.length === 0 ? (
        <p className="px-1 t-meta">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="space-y-7">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h2 className="t-section">{category}</h2>
                <span className="t-meta tabular-nums">{items.length}</span>
                <button
                  type="button"
                  onClick={() => { add(category) }}
                  className="ml-auto t-meta transition-colors duration-150 hover:text-text"
                >
                  + Add
                </button>
              </div>

              <div className="grid gap-2">
                {items.map((e) => (
                  <Card
                    key={e.id}
                    className={cn('p-3.5', e.is_go_to && 'border-accent/30 bg-accent-muted')}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* One tap to promote or demote the default. */}
                      <button
                        type="button"
                        onClick={() => { setGoTo.mutate(e) }}
                        aria-label={e.is_go_to ? `Unset ${e.name} as go-to` : `Make ${e.name} the go-to`}
                        className="mt-0.5 shrink-0"
                      >
                        <Star
                          className={cn(
                            'size-4 transition-colors duration-150',
                            e.is_go_to
                              ? 'fill-accent text-accent'
                              : 'text-text-3 hover:text-accent'
                          )}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditing(e)
                          setSeedCategory(undefined)
                          setSheetOpen(true)
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="t-item">{e.name}</span>
                          {e.is_go_to ? <Badge tone="accent">Go-to</Badge> : null}
                          {e.who && e.who !== 'Paul' ? <Badge>{e.who}</Badge> : null}
                        </div>
                        {e.area ? (
                          <p className="mt-0.5 inline-flex items-center gap-1 t-meta">
                            <MapPin className="size-3" aria-hidden />
                            {e.area}
                          </p>
                        ) : null}
                        {e.note ? (
                          <p className="mt-1.5 text-pretty text-[13px] leading-relaxed text-text-2">
                            {e.note}
                          </p>
                        ) : null}
                      </button>

                      {e.link ? (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 shrink-0 text-text-3 transition-colors duration-150 hover:text-text"
                          aria-label={`Open ${e.name}`}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PlaybookSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        entry={editing}
        categories={categories}
        defaultCategory={seedCategory}
      />
    </Page>
  )
}
