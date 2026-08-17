import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { defaultFollowUp } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { CommitmentRow, TablesInsert, TablesUpdate } from '@/types/models'

// Pure list logic lives in its own module so it can be tested without a
// database client. Re-exported here so call sites don't all have to change.
export { partition } from '@/lib/commitment-lists'

export const COMMITMENTS_KEY = ['commitments'] as const

export function useCommitments() {
  return useQuery({
    queryKey: COMMITMENTS_KEY,
    queryFn: async (): Promise<CommitmentRow[]> => {
      const { data, error } = await supabase
        .from('commitments')
        .select('*')
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

function useCommitmentMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  optimistic: (rows: CommitmentRow[], vars: TVars) => CommitmentRow[]
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: fn,
    // Optimistic across the board. Reed is standing there waiting; nothing in
    // this app blocks on a network round trip.
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: COMMITMENTS_KEY })
      const previous = queryClient.getQueryData<CommitmentRow[]>(COMMITMENTS_KEY) ?? []
      queryClient.setQueryData<CommitmentRow[]>(COMMITMENTS_KEY, optimistic(previous, vars))
      return { previous }
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(COMMITMENTS_KEY, context?.previous)
      toast.error('That didn’t save', { description: error.message })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: COMMITMENTS_KEY })
    },
  })
}

export function useCompleteCommitment() {
  const queryClient = useQueryClient()

  const mutation = useCommitmentMutation(
    async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('commitments')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    (rows, { id }) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, status: 'done' as const, completed_at: new Date().toISOString() }
          : row
      )
  )

  return (commitment: CommitmentRow) => {
    mutation.mutate({ id: commitment.id })

    toast.success('Done', {
      description: commitment.title,
      action: {
        label: 'Undo',
        onClick: () => {
          void supabase
            .from('commitments')
            .update({ status: commitment.status, completed_at: commitment.completed_at })
            .eq('id', commitment.id)
            .then(() => queryClient.invalidateQueries({ queryKey: COMMITMENTS_KEY }))
        },
      },
    })
  }
}

/**
 * Logging a nudge pushes the follow-up out rather than clearing it. The thing
 * is still outstanding — we have just chased it, and we will chase it again.
 */
export function useLogNudge() {
  return useCommitmentMutation(
    async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('commitments')
        .update({ last_nudged_at: new Date().toISOString(), follow_up_date: defaultFollowUp() })
        .eq('id', id)
      if (error) throw error
    },
    (rows, { id }) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              last_nudged_at: new Date().toISOString(),
              follow_up_date: defaultFollowUp(),
            }
          : row
      )
  )
}

/**
 * Closing the loop. The other half of the cadence.
 *
 * Reversible — marking something reported by mistake shouldn't be permanent,
 * and an irreversible one-tap action is one you hesitate over.
 */
export function useReportBack() {
  return useCommitmentMutation(
    async ({ id, note, undo }: { id: string; note: string | null; undo?: boolean }) => {
      const { error } = await supabase
        .from('commitments')
        .update({
          reported_back_at: undo ? null : new Date().toISOString(),
          report_note: undo ? null : note,
        })
        .eq('id', id)
      if (error) throw error
    },
    (rows, { id, note, undo }) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              reported_back_at: undo ? null : new Date().toISOString(),
              report_note: undo ? null : note,
            }
          : row
      )
  )
}

/**
 * "It is good." — the act that actually closes the loop.
 *
 * `inApp` records whether the requester confirmed it themselves or whether Reed
 * logged a confirmation given in person. Most will be the latter, and the
 * difference between "Paul confirmed" and "Reed says Paul confirmed" is worth
 * keeping honest.
 */
export function useConfirmCommitment() {
  return useCommitmentMutation(
    async ({
      id,
      note,
      byId,
      inApp,
      undo,
    }: {
      id: string
      note?: string | null
      byId?: string | null
      inApp: boolean
      undo?: boolean
    }) => {
      const { error } = await supabase
        .from('commitments')
        .update({
          confirmed_at: undo ? null : new Date().toISOString(),
          confirmed_by: undo ? null : (byId ?? null),
          confirmed_in_app: undo ? false : inApp,
          confirmation_note: undo ? null : (note?.trim() || null),
        })
        .eq('id', id)
      if (error) throw error
    },
    (rows, { id, note, byId, inApp, undo }) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              confirmed_at: undo ? null : new Date().toISOString(),
              confirmed_by: undo ? null : (byId ?? null),
              confirmed_in_app: undo ? false : inApp,
              confirmation_note: undo ? null : (note?.trim() || null),
            }
          : row
      )
  )
}

export function useSaveCommitment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TablesInsert<'commitments'> & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase
          .from('commitments')
          .update(rest as TablesUpdate<'commitments'>)
          .eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('commitments').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COMMITMENTS_KEY })
    },
    onError: (error) => {
      toast.error('That didn’t save', { description: error.message })
    },
  })
}
