import { cn } from '@/lib/utils'

// ─── Fórmula documentada ──────────────────────────────────────────────────────
// freeCash      = available - committed
// freeCashRatio = available > 0 ? freeCash / available : 0
//
// HOLGADO:    ratio > 0.40
// CONTROLADO: ratio > 0.20
// AJUSTADO:   ratio > 0.05
// CRÍTICO:    ratio <= 0.05 OR freeCash < 0

type StatusLevel = 'HOLGADO' | 'CONTROLADO' | 'AJUSTADO' | 'CRÍTICO'

const STATUS_CONFIG: Record<StatusLevel, {
  label:   string
  desc:    string
  bg:      string
  text:    string
  border:  string
  dot:     string
}> = {
  HOLGADO:    { label: 'Holgado',    desc: 'Buena liquidez disponible',         bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  CONTROLADO: { label: 'Controlado', desc: 'Liquidez dentro del rango normal',  bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20',     dot: 'bg-sky-400'     },
  AJUSTADO:   { label: 'Ajustado',   desc: 'Margen de maniobra reducido',       bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400'   },
  CRÍTICO:    { label: 'Crítico',    desc: 'Compromisos superan disponibilidad', bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-400'     },
}

export function getFinancialStatus(available: number, committed: number): StatusLevel {
  const freeCash = available - committed
  if (freeCash < 0) return 'CRÍTICO'
  const ratio = available > 0 ? freeCash / available : 0
  if (ratio > 0.40) return 'HOLGADO'
  if (ratio > 0.20) return 'CONTROLADO'
  if (ratio > 0.05) return 'AJUSTADO'
  return 'CRÍTICO'
}

interface Props {
  available: number
  committed: number
  freeCash:  number
}

export function FinancialStatusBar({ available, committed, freeCash }: Props) {
  const status = getFinancialStatus(available, committed)
  const cfg    = STATUS_CONFIG[status]
  const ratio  = available > 0 ? Math.max(0, Math.min(1, freeCash / available)) : 0
  const pct    = Math.round(ratio * 100)

  return (
    <div className={cn('rounded-xl border px-4 py-3 flex items-center justify-between gap-4', cfg.bg, cfg.border)}>
      <div className="flex items-center gap-2.5">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
        <div>
          <p className={cn('text-sm font-bold', cfg.text)}>{cfg.label}</p>
          <p className="text-[11px] text-content-muted">{cfg.desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:block">
          <div className="w-24 h-1.5 bg-base-elevated rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', cfg.dot)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-content-disabled text-right mt-0.5">{pct}% libre</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-content-muted">Estado del mes</p>
        </div>
      </div>
    </div>
  )
}
