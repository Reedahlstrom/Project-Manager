import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { InboxItemRow } from '@/types/database'

const INBOX_KEY = ['inbox'] as const

export function useInbox() {
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: async (): Promise<InboxItemRow[]> => {
      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Capture. Step one of the cadence, and the single most important interaction
 * in the app.
 *
 * It must never block on the network and never require a second field. A
 * commandment you didn't write down is a commandment you didn't receive, so the
 * row appears instantly and reconciles later — and if the insert fails, the text
 * is handed back rather than lost.
 */
export function useCapture(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rawText: string) => {
      const { error } = await supabase.from('inbox_items').insert({
        raw_text: rawText,
        source: 'quick',
        created_by: userId ?? null,
      })
      if (error) throw error
    },
    onMutate: async (rawText) => {
      await queryClient.cancelQueries({ queryKey: INBOX_KEY })
      const previous = queryClient.getQueryData<InboxItemRow[]>(INBOX_KEY) ?? []
      const optimistic: InboxItemRow = {
        id: `optimistic-${String(Date.now())}`,
        raw_text: rawText,
        source: 'quick',
        processed: false,
        created_by: userId ?? null,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<InboxItemRow[]>(INBOX_KEY, [optimistic, ...previous])
      return { previous }
    },
    onError: (_error, rawText, context) => {
      queryClient.setQueryData(INBOX_KEY, context?.previous)
      toast.error('Capture failed — here it is back', { description: rawText, duration: 30_000 })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: INBOX_KEY })
    },
  })
}

export function useDismissInboxItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inbox_items')
        .update({ processed: true })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: INBOX_KEY })
      const previous = queryClient.getQueryData<InboxItemRow[]>(INBOX_KEY) ?? []
      queryClient.setQueryData<InboxItemRow[]>(
        INBOX_KEY,
        previous.filter((item) => item.id !== id)
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(INBOX_KEY, context?.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: INBOX_KEY })
    },
  })
}

export { INBOX_KEY }
