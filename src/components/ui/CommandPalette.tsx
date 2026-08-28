import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Landmark, ArrowRight, DollarSign, TrendingUp, CreditCard, FileText, Megaphone, ShoppingCart, Bell } from 'lucide-react'
import { useApp }       from '@/context/AppContext'
import { cn } from '@/lib/utils'

interface SearchResult {
  id:       string
  label:    string
  sub?:     string
  icon:     React.ElementType
  path:     string
  category: string
}

const STATIC_ITEMS: SearchResult[] = [
  // Páginas
  { id: 'p-dashboard',   label: 'Dashboard',          icon: TrendingUp,  path: '/',               category: 'Páginas' },
  { id: 'p-payroll',     label: 'Equipo & Nómina',    icon: Users,       path: '/payroll',        category: 'Páginas' },
  { id: 'p-debts',       label: 'Deudas',             icon: Landmark,    path: '/debts',          category: 'Páginas' },
  { id: 'p-cashea',      label: 'Cashea',             icon: CreditCard,  path: '/cashea',         category: 'Páginas' },
  { id: 'p-san',         label: 'SAN',                icon: CreditCard,  path: '/san',            category: 'Páginas' },
  { id: 'p-clients',     label: 'Clientes',           icon: Users,       path: '/clients',        category: 'Páginas' },
  { id: 'p-receivables', label: 'Cuentas por cobrar', icon: DollarSign,  path: '/receivables',    category: 'Páginas' },
  { id: 'p-fixed',       label: 'Gastos Fijos',       icon: FileText,    path: '/fixed-expenses', category: 'Páginas' },
  { id: 'p-calendar',    label: 'Calendario',         icon: TrendingUp,  path: '/calendario',     category: 'Páginas' },
  { id: 'p-pending',     label: 'Pendientes',         icon: TrendingUp,  path: '/pending',        category: 'Páginas' },
  { id: 'p-accounts',    label: 'Cuentas',            icon: DollarSign,  path: '/accounts',       category: 'Páginas' },
  { id: 'p-ads',         label: 'Fernando ADS',       icon: Megaphone,   path: '/fernando-ads',   category: 'Páginas' },
  { id: 'p-purchases',   label: 'Por comprar',        icon: ShoppingCart, path: '/por-comprar',   category: 'Páginas' },
  { id: 'p-reminders',   label: 'Recordatorios',      icon: Bell,        path: '/recordatorios',  category: 'Páginas' },
]

export function CommandPalette() {
  const { commandOpen, closeCommand } = useApp()
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const ALL_ITEMS = STATIC_ITEMS

  const filtered = query.trim().length === 0
    ? ALL_ITEMS.slice(0, 10)
    : ALL_ITEMS.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.sub?.toLowerCase().includes(query.toLowerCase()) ||
        i.category.toLowerCase().includes(query.toLowerCase())
      )

  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setCursor(0)
    }
  }, [commandOpen])

  useEffect(() => { setCursor(0) }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(v => Math.min(v + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(v => Math.max(v - 1, 0)) }
    if (e.key === 'Enter' && filtered[cursor]) {
      navigate(filtered[cursor].path)
      closeCommand()
    }
  }

  function handleSelect(item: SearchResult) {
    navigate(item.path)
    closeCommand()
  }

  if (!commandOpen) return null

  const grouped: Record<string, SearchResult[]> = {}
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCommand} />
      <div className="relative w-full max-w-xl bg-base-surface border border-base-border rounded-2xl shadow-glow overflow-hidden animate-fade-in">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-border">
          <Search className="w-4 h-4 text-content-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, clientes, empleados..."
            className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-disabled outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-base-border text-content-disabled">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-content-muted">Sin resultados para "{query}"</p>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-disabled">{cat}</p>
                {items.map((item) => {
                  const globalIdx = filtered.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        globalIdx === cursor ? 'bg-brand-600/10 text-brand-400' : 'text-content-primary hover:bg-base-hover'
                      )}
                    >
                      <item.icon className={cn('w-4 h-4 flex-shrink-0', globalIdx === cursor ? 'text-brand-400' : 'text-content-disabled')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        {item.sub && <p className="text-xs text-content-muted truncate">{item.sub}</p>}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-content-disabled flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-base-border">
          {[['↑↓', 'navegar'], ['↵', 'abrir'], ['ESC', 'cerrar']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd className="text-[9px] px-1.5 py-0.5 rounded border border-base-border text-content-disabled">{key}</kbd>
              <span className="text-[10px] text-content-disabled">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
