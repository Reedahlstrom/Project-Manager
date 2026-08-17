import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { Database, Tables } from '@/types/models'

export type PlaybookEntry = Tables<'playbook'>
export type PlaybookInsert = Database['public']['Tables']['playbook']['Insert']

const KEY = ['playbook'] as const

export function usePlaybook() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<PlaybookEntry[]> => {
      const { data, error } = await supabase
        .from('playbook')
        .select('*')
        .is('deleted_at', null)
        // Go-to entries first within each category — the default answer should
        // be the first thing your eye lands on.
        .order('category')
        .order('is_go_to', { ascending: false })
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Categories already in use, most-used first.
 *
 * The category field is free text so you can write down anything without a
 * schema change — but retyping "Restaurants" every time is how a capture tool
 * stops getting used. These become the suggestions.
 */
export function useCategories(entries: PlaybookEntry[]) {
  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
}

export function useSavePlaybookEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PlaybookInsert & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase.from('playbook').update(rest).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('playbook').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
    },
    onError: (error) => {
      toast.error('That didn’t save', { description: error.message })
    },
  })
}

/**
 * Only one go-to per category and area — that is the whole point. Setting a new
 * one clears the old rather than leaving two defaults and no decision.
 */
export function useSetGoTo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: PlaybookEntry) => {
      if (!entry.is_go_to) {
        const clear = supabase
          .from('playbook')
          .update({ is_go_to: false })
          .eq('category', entry.category)
          .is('deleted_at', null)
        // Null area means "anywhere", and is its own bucket.
        const { error: clearErr } = await (entry.area === null
          ? clear.is('area', null)
          : clear.eq('area', entry.area))
        if (clearErr) throw clearErr
      }
      const { error } = await supabase
        .from('playbook')
        .update({ is_go_to: !entry.is_go_to })
        .eq('id', entry.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
    },
    onError: (error) => {
      toast.error('Could not set that', { description: error.message })
    },
  })
}

export function useDeletePlaybookEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playbook')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
    },
  })
}
