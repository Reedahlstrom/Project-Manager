import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type {
  EventRow,
  Health,
  PersonRow,
  ProjectRow,
  TablesInsert,
  TablesUpdate,
} from '@/types/models'

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

/**
 * Health is edited inline on the Projects list, so it is optimistic — changing
 * a red to a green should feel like flipping a switch, not submitting a form.
 */
export function useUpdateProjectHealth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      health,
      note,
    }: {
      id: string
      health: Health
      note?: string | null
    }) => {
      const { error } = await supabase
        .from('projects')
        .update({ health, ...(note !== undefined ? { health_note: note } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, health, note }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previous = queryClient.getQueryData<ProjectRow[]>(['projects']) ?? []
      queryClient.setQueryData<ProjectRow[]>(
        ['projects'],
        previous.map((project) =>
          project.id === id
            ? { ...project, health, ...(note !== undefined ? { health_note: note } : {}) }
            : project
        )
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(['projects'], context?.previous)
      toast.error('That didn’t save', { description: error.message })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useSaveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TablesInsert<'projects'> & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase
          .from('projects')
          .update(rest as TablesUpdate<'projects'>)
          .eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('projects').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      toast.error('That didn’t save', { description: error.message })
    },
  })
}

/**
 * Soft delete. Nothing with history is ever hard-deleted — the commitments,
 * notes and decisions underneath a project outlive the decision to stop looking
 * at it, and un-archiving is one UPDATE.
 */
export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Archived', { description: 'Nothing was deleted.' })
    },
    onError: (error) => {
      toast.error('Could not archive', { description: error.message })
    },
  })
}

/** Every future event, so each project can show the next thing on its calendar. */
export function useFutureEvents() {
  return useQuery({
    queryKey: ['events', 'future'],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
      if (error) throw error
      return data
    },
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
