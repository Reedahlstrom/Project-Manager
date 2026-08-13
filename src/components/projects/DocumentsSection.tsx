import { FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, Row } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import {
  formatBytes,
  openDocument,
  useDeleteDocument,
  useProjectDocuments,
  useUploadDocument,
} from '@/hooks/useDocuments'

export function DocumentsSection({ projectId }: { projectId: string }) {
  const { session } = useAuth()
  const { data: docs = [] } = useProjectDocuments(projectId)
  const upload = useUploadDocument(projectId)
  const remove = useDeleteDocument(projectId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function send(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      upload.mutate({ file, userId: session?.user.id ?? null })
    }
  }

  return (
    <>
      {docs.length > 0 ? (
        <Card className="mb-2 p-1">
          {docs.map((doc) => (
            <Row key={doc.id} className="items-center">
              <FileText className="size-4 shrink-0 text-text-3" aria-hidden />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left t-item hover:underline"
                onClick={() => void openDocument(doc.storage_path)}
              >
                {doc.name}
              </button>
              <span className="t-meta shrink-0">{formatBytes(doc.size_bytes)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-text-3"
                aria-label={`Remove ${doc.name}`}
                onClick={() => { remove.mutate(doc) }}
              >
                <Trash2 />
              </Button>
            </Row>
          ))}
        </Card>
      ) : null}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => { setDragging(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          send(e.dataTransfer.files)
        }}
        className={[
          'flex flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center',
          'transition-colors duration-150',
          dragging ? 'border-accent bg-accent-muted' : 'border-border',
        ].join(' ')}
      >
        <Upload className="mb-2 size-5 text-text-3" aria-hidden />
        <p className="text-sm text-text-2">
          {upload.isPending ? 'Uploading…' : 'Drop a file here, or'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { send(e.target.files); e.target.value = '' }}
        />
        {/* Worth stating plainly on a screen that holds Church material. */}
        <p className="mt-3 t-meta">
          Private storage. Links expire after 60 seconds and follow this project&rsquo;s privacy.
        </p>
      </div>
    </>
  )
}
