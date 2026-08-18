import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { Database, Tables } from '@/types/models'

export type Meeting = Tables<'meetings'>
export type MeetingInsert = Database['public']['Tables']['meetings']['Insert']

export type Proposal = {
  title: string
  detail: string | null
  owner: 'me' | 'paul' | 'heather' | 'external'
  due_date: string | null
}

export type ExtractResult = {
  ok: boolean
  refused?: boolean
  reason?: string
  error?: string
  projectId?: string | null
  autoRouted?: boolean
  routedBy?: string
  proposals?: Proposal[]
}

const KEY = ['meetings'] as const

export function useMeetings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Meeting[]> => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .is('deleted_at', null)
        .order('met_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useProjectMeetings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['meetings', projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<Meeting[]> => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('project_id', projectId ?? '')
        .is('deleted_at', null)
        .order('met_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: MeetingInsert & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase.from('meetings').update(rest).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase.from('meetings').insert(input).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
    onError: (error) => {
      toast.error('That didn’t save', { description: error.message })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meetings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

/**
 * Ask for a project guess and a list of action items.
 *
 * Returns proposals only. Nothing is written as a commitment until Reed accepts
 * it — a model deciding what he owes people is the thing this app exists to
 * avoid.
 */
export function useExtractMeeting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (meetingId: string): Promise<ExtractResult> => {
      const result = await supabase.functions.invoke<ExtractResult>('extract-meeting', {
        body: { meetingId },
      })
      if (result.error) throw result.error
      return result.data ?? { ok: false, error: 'No response from the function' }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] })
      if (result.refused) {
        toast.info('Not sent for extraction', { description: result.reason, duration: 20_000 })
      } else if (!result.ok) {
        toast.error('Extraction failed', { description: result.error, duration: 20_000 })
      }
    },
    onError: (error) => {
      toast.error('Extraction failed', { description: error.message, duration: 20_000 })
    },
  })
}
