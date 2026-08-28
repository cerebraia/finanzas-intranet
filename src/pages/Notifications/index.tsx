import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, ExternalLink } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { usePendingItems } from '@/hooks/usePendingItems'
import { useReminders }    from '@/hooks/usePurchases'
import { useWorkspace }    from '@/context/WorkspaceContext'

type NotifPriority = 'critical' | 'warning' | 'info'

interface NotifItem {
  id:       string
  title:    string
  body:     string
  priority: NotifPriority
  amount?:  number
  dueDate?: string
  link?:    string
  read:     boolean
}

const PRIORITY_CLS: Record<NotifPriority, string> = {
  critical: 'border-red-500/40 bg-red-500/5 border-l-red-500',
  warning:  'border-amber-500/40 bg-amber-500/5 border-l-amber-400',
  info:     'border-brand-600/30 bg-brand-600/5 border-l-brand-500',
}

const SOURCE_LINK: Record<string, string> = {
  RECEIVABLE:        '/receivables',
  PAYROLL:           '/payroll',
  RECURRING_EXPENSE: '/fixed-expenses',
  DEBT:              '/debts',
}

const SOURCE_LABEL: Record<string, string> = {
  RECEIVABLE:        'Cobro pendiente',
  PAYROLL:           'Nómina',
  RECURRING_EXPENSE: 'Gasto fijo',
  DEBT:              'Cuota deuda',
}

function getPriority(status: string, daysUntilDue: number): NotifPriority {
  if (status === 'OVERDUE') return 'critical'
  if (daysUntilDue <= 3) return 'warning'
  return 'info'
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id

  const { data: pending = [] } = usePendingItems(wsId, { limit: 50 })
  const { pending: reminders } = useReminders()

  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const notifications = useMemo((): NotifItem[] => {
    const today  = new Date()
    const items: NotifItem[] = []

    // Pending items → notificaciones
    for (const item of pending) {
      const due  = new Date(item.dueDate)
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
      const prio = getPriority(item.status, diff)

      const directionLabel = item.sourceType === 'RECEIVABLE'
        ? 'Por cobrar'
        : 'Por pagar'

      items.push({
        id:       item.id,
        title:    item.title,
        body:     `${SOURCE_LABEL[item.sourceType] ?? item.sourceType} — ${directionLabel}: ${formatCurrency(item.pendingAmount)}`,
        priority: prio,
        amount:   item.pendingAmount,
        dueDate:  item.dueDate,
        link:     SOURCE_LINK[item.sourceType],
        read:     readIds.has(item.id),
      })
    }

    // Recordatorios pendientes
    for (const r of reminders) {
      const due  = new Date(r.snoozedTo ?? r.reminderDate)
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
      items.push({
        id:       r.id,
        title:    r.title,
        body:     r.description ?? 'Recordatorio manual',
        priority: diff < 0 ? 'critical' : 'info',
        dueDate:  r.snoozedTo ?? r.reminderDate,
        link:     '/recordatorios',
        read:     readIds.has(r.id),
      })
    }

    // Ordenar: críticos primero, luego por fecha
    return items.sort((a, b) => {
      const pOrd = { critical: 0, warning: 1, info: 2 }
      const pd = pOrd[a.priority] - pOrd[b.priority]
      if (pd !== 0) return pd
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    })
  }, [pending, reminders, readIds])

  const unreadCount = notifications.filter(n => !n.read).length

  function markRead(id: string) {
    setReadIds(prev => new Set([...prev, id]))
  }

  function markAllRead() {
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  function handleClick(notif: NotifItem) {
    markRead(notif.id)
    if (notif.link) navigate(notif.link)
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <PageHeader
        title="Notificaciones"
        description={unreadCount > 0 ? `${unreadCount} compromisos pendientes` : 'Todo al día'}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todo como leído
            </button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <BellOff className="w-10 h-10 text-content-disabled mx-auto" />
          <p className="text-sm font-semibold text-content-primary">Sin notificaciones</p>
          <p className="text-xs text-content-muted">Estás al día con todos tus compromisos.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'rounded-xl border border-l-4 p-4 cursor-pointer transition-all duration-150',
                'hover:brightness-110',
                PRIORITY_CLS[notif.priority],
                !notif.read && 'shadow-sm',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Bell className={cn(
                    'w-4 h-4',
                    notif.priority === 'critical' ? 'text-red-400' :
                    notif.priority === 'warning'  ? 'text-amber-400' : 'text-brand-400'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={cn('text-sm font-semibold', notif.read ? 'text-content-secondary' : 'text-content-primary')}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-content-muted">{notif.body}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {notif.amount != null && notif.amount > 0 && (
                      <span className="text-xs font-semibold text-amber-400">{formatCurrency(notif.amount)}</span>
                    )}
                    {notif.dueDate && (
                      <span className="text-xs text-content-disabled">{formatDate(notif.dueDate)}</span>
                    )}
                  </div>
                </div>
                {notif.link && (
                  <ExternalLink className="w-3.5 h-3.5 text-content-disabled flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
