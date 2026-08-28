import { useState } from 'react'
import { Wallet, Plus, Building2, Smartphone, Coins, Bitcoin, CreditCard } from 'lucide-react'
import { PageHeader, EmptyState, Card } from '@/components/ui'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAccounts, useCreateAccount } from '@/hooks/useAccounts'
import { formatCurrency, cn } from '@/lib/utils'
import type { AccountType } from '@/types/api'

const iconMap: Record<AccountType, typeof Wallet> = {
  BANK:        Building2,
  ZELLE:       Smartphone,
  CASH:        Coins,
  CRYPTO:      Bitcoin,
  CREDIT_CARD: CreditCard,
  OTHER:       Wallet,
}

const colorMap: Record<AccountType, string> = {
  BANK:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ZELLE:       'text-green-400 bg-green-500/10 border-green-500/20',
  CASH:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CRYPTO:      'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CREDIT_CARD: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  OTHER:       'text-content-muted bg-base-elevated border-base-border',
}

const labelMap: Record<AccountType, string> = {
  BANK: 'Banco', ZELLE: 'Zelle', CASH: 'Efectivo', CRYPTO: 'Cripto', CREDIT_CARD: 'Tarjeta', OTHER: 'Otro',
}

export function AccountsPage() {
  const { activeWorkspace } = useWorkspace()
  const { data: accounts = [], isLoading } = useAccounts(activeWorkspace.id)
  const createAccount = useCreateAccount()
  const [showForm, setShowForm] = useState(false)
  const [name, setName]     = useState('')
  const [type, setType]     = useState<AccountType>('BANK')
  const [initial, setInitial] = useState('')

  const total = accounts.reduce((s, a) => s + a.currentBalance, 0)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createAccount.mutateAsync({
      workspaceId:    activeWorkspace.id,
      name,
      type,
      initialBalance: Number(initial) || 0,
    })
    setName(''); setType('BANK'); setInitial(''); setShowForm(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated text-sm text-content-primary placeholder:text-content-disabled focus:outline-none focus:ring-1 focus:ring-brand-600 transition-colors'

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cuentas"
        description={`${accounts.length} cuentas · Total: ${formatCurrency(total)}`}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva cuenta
          </button>
        }
      />

      {showForm && (
        <Card className="p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Nueva cuenta</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" className={inputCls} />
            <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={inputCls}>
              {(Object.keys(labelMap) as AccountType[]).map((t) => (
                <option key={t} value={t}>{labelMap[t]}</option>
              ))}
            </select>
            <input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="Saldo inicial (0)" className={inputCls} />
            <div className="sm:col-span-3 flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-base-border text-sm text-content-muted hover:bg-base-hover transition-colors">Cancelar</button>
              <button type="submit" disabled={createAccount.isPending} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {createAccount.isPending ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {isLoading && <p className="text-content-muted text-sm text-center py-8">Cargando cuentas...</p>}

      {!isLoading && accounts.length === 0 && (
        <EmptyState icon={Wallet} title="Sin cuentas" description="Crea tu primera cuenta para empezar." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const Icon = iconMap[account.type]
          const isNegative = account.currentBalance < 0
          return (
            <Card key={account.id} className="p-5 hover:border-brand-600/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-content-primary">{account.name}</p>
                  <p className="text-xs text-content-muted mt-0.5">{labelMap[account.type]}</p>
                </div>
                <div className={cn('p-2 rounded-lg border flex-shrink-0', colorMap[account.type])}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className={cn('text-2xl font-bold tabular-nums', isNegative ? 'text-red-400' : 'text-content-primary')}>
                {formatCurrency(account.currentBalance)}
              </p>
              <p className="text-xs text-content-disabled mt-1">
                Saldo inicial: {formatCurrency(Number(account.initialBalance))}
              </p>
            </Card>
          )
        })}
      </div>

      {accounts.length > 0 && (
        <Card className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-content-muted uppercase tracking-wider">Total en cuentas</span>
          <span className={cn('text-xl font-bold tabular-nums', total < 0 ? 'text-red-400' : 'text-content-primary')}>
            {formatCurrency(total)}
          </span>
        </Card>
      )}
    </div>
  )
}
