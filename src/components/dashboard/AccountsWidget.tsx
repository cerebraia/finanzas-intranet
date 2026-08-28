import { Building2, Smartphone, Coins, Bitcoin, CreditCard } from 'lucide-react'
import type { Account, AccountType } from '@/types'
import { cn } from '@/lib/utils'

const accountIcons: Record<AccountType, typeof Building2> = {
  bank:    Building2,
  digital: Smartphone,
  cash:    Coins,
  crypto:  Bitcoin,
}

const accountColors: Record<AccountType, string> = {
  bank:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  digital: 'text-green-400 bg-green-500/10 border-green-500/20',
  cash:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  crypto:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

interface AccountsWidgetProps {
  accounts: Account[]
}

export function AccountsWidget({ accounts }: AccountsWidgetProps) {
  const total = accounts.reduce((sum, a) => sum + a.balance, 0)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-content-primary">Cuentas</h3>
        </div>
        <span className="text-xs text-content-muted">{accounts.length} cuentas</span>
      </div>

      <ul className="space-y-2">
        {accounts.map((account) => {
          const Icon = accountIcons[account.type]
          return (
            <li key={account.id} className="flex items-center gap-3">
              <div className={cn('p-1.5 rounded-lg border flex-shrink-0', accountColors[account.type])}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 text-sm text-content-secondary truncate">{account.name}</span>
              <span className="text-sm font-semibold text-content-primary tabular-nums">
                ${account.balance.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="pt-3 border-t border-base-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">Total</span>
        <span className="text-base font-bold text-content-primary tabular-nums">
          ${total.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  )
}
