import { useState, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDefaultAccount } from '@/hooks/useDefaultAccount'
import { useQuickPay } from '@/hooks/useQuickPay'
import { useAccounts } from '@/hooks/useAccounts'
import type { PendingItem } from '@/types/api'

type ButtonState = 'idle' | 'loading' | 'done' | 'needs-account'

interface QuickPayButtonProps {
  item:        PendingItem
  workspaceId: string
  size?:       'sm' | 'md'
}

export function QuickPayButton({ item, workspaceId, size = 'sm' }: QuickPayButtonProps) {
  const isIncoming = item.direction === 'INCOMING'

  const { defaultPayAccountId, defaultCollectAccountId, setDefaultPayAccount, setDefaultCollectAccount } =
    useDefaultAccount(workspaceId)

  const { quickPay } = useQuickPay()
  const { data: accounts = [] } = useAccounts(workspaceId)

  const [state,          setState]          = useState<ButtonState>('idle')
  const [localAccountId, setLocalAccountId] = useState('')
  const [saveAsDefault,  setSaveAsDefault]  = useState(true)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (state === 'done') {
      timer = setTimeout(() => setState('idle'), 1200)
    }
    return () => clearTimeout(timer)
  }, [state])

  const defaultAccountId = isIncoming ? defaultCollectAccountId : defaultPayAccountId

  async function handleClick() {
    if (state !== 'idle') return

    if (defaultAccountId) {
      setState('loading')
      try {
        await quickPay(item, defaultAccountId)
        setState('done')
      } catch {
        setState('idle')
      }
    } else {
      setState('needs-account')
    }
  }

  async function handleConfirm() {
    if (!localAccountId) return
    if (saveAsDefault) {
      if (isIncoming) {
        setDefaultCollectAccount(localAccountId)
      } else {
        setDefaultPayAccount(localAccountId)
      }
    }
    setState('loading')
    try {
      await quickPay(item, localAccountId)
      setState('done')
    } catch {
      setState('idle')
    }
  }

  const sizeCls = size === 'sm'
    ? 'w-9 h-9 min-w-[36px]'
    : 'w-11 h-11 min-w-[44px]'

  const actionLabel = isIncoming ? 'Cobrar' : 'Pagar'

  if (state === 'needs-account') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={localAccountId}
          onChange={e => setLocalAccountId(e.target.value)}
          className={cn(
            'px-2 py-1 rounded-lg border border-base-border bg-base-elevated',
            'text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-600',
            'transition-colors'
          )}
        >
          <option value="">Cuenta...</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-[10px] text-content-muted cursor-pointer">
          <input
            type="checkbox"
            checked={saveAsDefault}
            onChange={e => setSaveAsDefault(e.target.checked)}
            className="w-3 h-3"
          />
          Predeterminada
        </label>
        <button
          disabled={!localAccountId}
          onClick={handleConfirm}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
            isIncoming
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed'
              : 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {actionLabel}
        </button>
        <button
          onClick={() => setState('idle')}
          className="px-1.5 py-1 rounded-lg text-xs text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || state === 'done'}
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
