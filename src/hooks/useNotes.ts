import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { NoteRow, TablesInsert } from '@/types/models'

/**
 * Notes are the main event on a project, not a tab at the bottom of one.
 *
 * The usual loop is: something happens, you write it down, and part of what you
 * wrote becomes a thing you owe someone. So a note is cheap to create and one
 * click from becoming a commitment.
 */
export function useProjectNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['notes', projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<NoteRow[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId ?? '')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveNote(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TablesInsert<'notes'> & { id?: string }) => {
      if (input.id !== undefined) {
        const { id, ...rest } = input
        const { error } = await supabase.from('notes').update(rest).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('notes').insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', projectId] })
    },
    onError: (error) => {
      toast.error('Note didn’t save', { description: error.message })
    },
  })
}

export function useDeleteNote(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete — notes are the record of what was said and when.
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes', projectId] })
    },
  })
}
