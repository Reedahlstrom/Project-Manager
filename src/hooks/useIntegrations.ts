import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/models'

export type RoutingRule = Database['public']['Tables']['routing_rules']['Row']
export type IntegrationState = Database['public']['Tables']['integration_state']['Row']

export function useIntegrationState() {
  return useQuery({
    queryKey: ['integration_state'],
    queryFn: async (): Promise<IntegrationState[]> => {
      const { data, error } = await supabase.from('integration_state').select('*')
      if (error) throw error
      return data
    },
    refetchInterval: 15_000,
  })
}

export function useRoutingRules() {
  return useQuery({
    queryKey: ['routing_rules'],
    queryFn: async (): Promise<RoutingRule[]> => {
      const { data, error } = await supabase
        .from('routing_rules')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rule: Database['public']['Tables']['routing_rules']['Insert']) => {
      const { error } = await supabase.from('routing_rules').insert(rule)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routing_rules'] })
    },
    onError: (error) => {
      toast.error('Rule didn’t save', {
        description: error.message.includes('duplicate')
          ? 'That rule already exists.'
          : error.message,
      })
    },
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routing_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routing_rules'] })
    },
  })
}

type SyncResult = {
  ok: boolean
  error?: string
  synced?: number
  inboxed?: number
  flagged?: number
  ignored?: number
}

/**
 * Kick a sync by hand.
 *
 * Deliberately manual before anything is scheduled: you should watch what a run
 * actually pulls in before letting it run every fifteen minutes unattended.
 */
export function useRunSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fn: 'sync-calendar' | 'triage-email') => {
      // `invoke` returns `any`; name the shape once here so nothing downstream
      // is operating on an unchecked value.
      const result = await supabase.functions.invoke<SyncResult>(fn, { body: {} })
      if (result.error) throw result.error
      return result.data ?? { ok: false, error: 'No response from the function' }
    },
    onSuccess: (data, fn) => {
      if (!data.ok) {
        toast.error(fn === 'sync-calendar' ? 'Calendar sync failed' : 'Email check failed', {
          description: data.error,
          duration: 20_000,
        })
        return
      }
      const summary =
        fn === 'sync-calendar'
          ? `${String(data.synced ?? 0)} synced, ${String(data.inboxed ?? 0)} to triage`
          : `${String(data.flagged ?? 0)} flagged, ${String(data.ignored ?? 0)} ignored`
      toast.success(fn === 'sync-calendar' ? 'Calendar synced' : 'Email checked', {
        description: summary,
      })
      void queryClient.invalidateQueries()
    },
    onError: (error) => {
      toast.error('That run failed', { description: error.message, duration: 20_000 })
    },
  })
}
