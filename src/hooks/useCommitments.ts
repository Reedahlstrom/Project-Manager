import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { defaultFollowUp, todayISO } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { CommitmentRow, TablesInsert, TablesUpdate } from '@/types/database'

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

/**
 * The four lists on Today, derived in one pass.
 *
 * `chase` and `reportBack` are the two symmetric halves of the cadence:
 * someone owes us, and we owe someone. Both are computed here so the ordering
 * rules live in one place rather than in the components.
 */
export function partition(commitments: CommitmentRow[]) {
  const today = todayISO()
  const open = commitments.filter((c) => c.status !== 'done' && c.status !== 'dropped')

  return {
    overdue: open
      .filter((c) => c.due_date !== null && c.due_date < today)
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),

    dueToday: open.filter((c) => c.due_date === today),

    // Waiting on someone else, and the follow-up date has arrived.
    chase: open
      .filter((c) => c.status === 'waiting' && c.follow_up_date !== null && c.follow_up_date <= today)
      .sort((a, b) => (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? '')),

    // Done, someone asked for it, and they still don't know it's finished.
    reportBack: commitments
      .filter(
        (c) => c.status === 'done' && c.requested_by !== null && c.reported_back_at === null
      )
      .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? '')),
  }
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

/** Closing the loop. The other half of the cadence. */
export function useReportBack() {
  return useCommitmentMutation(
    async ({ id, note }: { id: string; note: string | null }) => {
      const { error } = await supabase
        .from('commitments')
        .update({ reported_back_at: new Date().toISOString(), report_note: note })
        .eq('id', id)
      if (error) throw error
    },
    (rows, { id, note }) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, reported_back_at: new Date().toISOString(), report_note: note }
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
