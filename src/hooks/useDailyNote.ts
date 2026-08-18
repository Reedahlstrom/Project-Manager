import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/dates'
import type { Tables } from '@/types/models'

export type DailyNote = Tables<'daily_notes'>

const key = (date: string) => ['daily_note', date] as const

export function useDailyNote(date: string = todayISO()) {
  return useQuery({
    queryKey: key(date),
    queryFn: async (): Promise<DailyNote | null> => {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('note_date', date)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Every day that has a note, newest first — for flipping back through them. */
export function useNoteDates() {
  return useQuery({
    queryKey: ['daily_note_dates'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('note_date')
        .order('note_date', { ascending: false })
        .limit(60)
      if (error) throw error
      return data.map((d) => d.note_date)
    },
    staleTime: 60_000,
  })
}

/**
 * Capture: append one line to today's note.
 *
 * A database function rather than read-modify-write, because capture has to
 * survive typing fast. Two round trips would race, and the second line would
 * overwrite the first — losing exactly the thing you were trying not to lose.
 */
export function useAppendLine(date: string = todayISO()) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (line: string) => {
      const { error } = await supabase.rpc('append_to_daily_note', {
        p_line: line,
        p_date: date,
      })
      if (error) throw error
    },
    onMutate: async (line) => {
      await queryClient.cancelQueries({ queryKey: key(date) })
      const previous = queryClient.getQueryData<DailyNote | null>(key(date))
      queryClient.setQueryData<DailyNote | null>(key(date), (old) =>
        old
          ? { ...old, body: old.body === '' ? line : `${old.body}\n${line}` }
          : ({ body: line, note_date: date } as DailyNote)
      )
      return { previous }
    },
    onError: (_error, line, context) => {
      queryClient.setQueryData(key(date), context?.previous)
      toast.error('Capture failed — here it is back', { description: line, duration: 30_000 })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key(date) })
      void queryClient.invalidateQueries({ queryKey: ['daily_note_dates'] })
    },
  })
}

/** Save the whole body. Debounced by the editor; this is the write itself. */
export function useSaveDailyNote(date: string = todayISO()) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ body, authorId }: { body: string; authorId: string }) => {
      const { error } = await supabase
        .from('daily_notes')
        .upsert(
          { note_date: date, author_id: authorId, body },
          { onConflict: 'note_date,author_id' }
        )
      if (error) throw error
    },
    onError: (error) => {
      toast.error('Note didn’t save', { description: error.message })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['daily_note_dates'] })
    },
  })
}

/** Split a body into lines, preserving blanks so the editor round-trips. */
export function toLines(body: string): string[] {
  return body === '' ? [''] : body.split('\n')
}
