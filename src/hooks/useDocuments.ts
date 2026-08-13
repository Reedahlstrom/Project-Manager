import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import type { DocumentRow } from '@/types/models'

const BUCKET = 'documents'

export function useProjectDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['documents', projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<DocumentRow[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId ?? '')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/**
 * Upload to the private bucket, then record the row.
 *
 * The storage path starts with the project id because that is what the storage
 * policies read — access follows the project, including the restricted cascade.
 */
export function useUploadDocument(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string | null }) => {
      if (!projectId) throw new Error('No project')

      const safeName = file.name.replace(/[^\w.-]+/g, '_')
      const path = `${projectId}/${crypto.randomUUID()}-${safeName}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (upErr) throw upErr

      const { error: rowErr } = await supabase.from('documents').insert({
        project_id: projectId,
        name: file.name,
        storage_path: path,
        mime: file.type || null,
        size_bytes: file.size,
        uploaded_by: userId,
      })
      if (rowErr) {
        // Don't leave an orphan in the bucket if the row fails.
        await supabase.storage.from(BUCKET).remove([path])
        throw rowErr
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
    onError: (error) => {
      toast.error('Upload failed', { description: error.message })
    },
  })
}

/**
 * Signed URLs only, and short ones. A document link that stays valid is a
 * document link that gets forwarded.
 */
export async function openDocument(storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60)
  if (error) {
    toast.error('Could not open that file', { description: error.message })
    return
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export function useDeleteDocument(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (doc: DocumentRow) => {
      await supabase.storage.from(BUCKET).remove([doc.storage_path])
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', doc.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents', projectId] })
    },
    onError: (error) => {
      toast.error('Could not remove that file', { description: error.message })
    },
  })
}

export function formatBytes(bytes: number | null) {
  if (bytes === null) return ''
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
