import { Toaster as Sonner } from 'sonner'

/**
 * Toasts carry undo. In prompt 4, completing a commitment is optimistic and the
 * toast is the only way back — so the duration here is load-bearing, not
 * cosmetic. Ten seconds is the spec.
 */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      duration={10_000}
      toastOptions={{
        classNames: {
          toast:
            'group !bg-surface-4 !border !border-border !text-text !rounded-xl !shadow-2xl !shadow-black/60',
          description: '!text-text-2',
          actionButton: '!bg-accent !text-accent-contrast !rounded-md !font-medium',
          cancelButton: '!bg-surface-3 !text-text-2 !rounded-md',
        },
      }}
    />
  )
}
