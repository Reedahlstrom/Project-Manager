import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { EventRow, PersonRow, ProjectRow } from '@/types/models'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function usePeople() {
  return useQuery({
    queryKey: ['people'],
    queryFn: async (): Promise<PersonRow[]> => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

/** The next seven days, for the compact strip on Today. */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async (): Promise<EventRow[]> => {
      const now = new Date()
      const week = new Date(now.getTime() + 7 * 86_400_000)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', week.toISOString())
        .order('starts_at')
      if (error) throw error
      return data
    },
  })
}
