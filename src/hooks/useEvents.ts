import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/models'

export function useSaveEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TablesInsert<'events'> & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase
          .from('events')
          .update(rest as TablesUpdate<'events'>)
          .eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('events').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error) => {
      toast.error('That didn’t save', { description: error.message })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

/**
 * The browser's own zone, used as the default when creating an event.
 * Events store UTC plus an explicit zone because a convening happens in a
 * place, and "3pm" means 3pm there.
 */
export function localTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** `datetime-local` gives "YYYY-MM-DDTHH:mm" in local time; store UTC. */
export function localInputToISO(value: string) {
  return new Date(value).toISOString()
}

export function isoToLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
