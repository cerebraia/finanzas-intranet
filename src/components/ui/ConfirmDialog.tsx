import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open:        boolean
  onConfirm:   () => void
  onCancel:    () => void
  title:       string
  description: string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      'danger' | 'warning'
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-sm',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                'w-4 h-4',
                variant === 'danger' ? 'text-red-400' : 'text-amber-400'
              )} />
              <Dialog.Title className="text-sm font-semibold text-content-primary">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              onClick={onCancel}
              className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm text-content-muted">{description}</p>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                variant === 'danger'
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-white'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
