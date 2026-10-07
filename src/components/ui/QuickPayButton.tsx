import { useState, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickPay } from '@/hooks/useQuickPay'
import { toast } from 'sonner'
import { mapSupabaseError } from '@/lib/errorMap'
import type { PendingItem } from '@/types/api'

type ButtonState = 'idle' | 'loading' | 'done'

interface QuickPayButtonProps {
  item:         PendingItem
  workspaceId?: string
  size?:        'sm' | 'md'
}

export function QuickPayButton({ item, size = 'sm' }: QuickPayButtonProps) {
  const isIncoming = item.direction === 'INCOMING'
  const { quickPay } = useQuickPay()

  const [state, setState] = useState<ButtonState>('idle')

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (state === 'done') {
      timer = setTimeout(() => setState('idle'), 1200)
    }
    return () => clearTimeout(timer)
  }, [state])

  async function handleClick() {
    if (state !== 'idle') return
    setState('loading')
    try {
      await quickPay(item)
      setState('done')
    } catch (err) {
      setState('idle')
      toast.error(err instanceof Error ? mapSupabaseError(err) : 'No pudimos registrar el pago.')
    }
  }

  const sizeCls = size === 'sm'
    ? 'w-9 h-9 min-w-[36px]'
    : 'w-11 h-11 min-w-[44px]'

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      aria-label={`Marcar ${item.title} como ${isIncoming ? 'cobrado' : 'pagado'}`}
      className={cn(
        'flex items-center justify-center rounded-full transition-all duration-150',
        sizeCls,
        state === 'idle' && !isIncoming && 'border-2 border-base-border text-content-disabled hover:border-brand-500 hover:text-brand-400 hover:bg-brand-500/5',
        state === 'idle' && isIncoming  && 'border-2 border-base-border text-content-disabled hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/5',
        state === 'loading' && 'border-2 border-brand-500/50 text-brand-400 cursor-wait',
        state === 'done'    && 'border-2 border-emerald-500 bg-emerald-500/15 text-emerald-400',
      )}
    >
      {state === 'loading' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Check className="w-4 h-4" />
      )}
    </button>
  )
}
