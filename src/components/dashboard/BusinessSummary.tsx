import { Megaphone } from 'lucide-react'
import type { BusinessSummaryRow, SummaryRowType } from '@/types'
import { cn } from '@/lib/utils'

const rowColors: Record<SummaryRowType, string> = {
  income:  'text-emerald-400',
  expense: 'text-red-400',
  total:   'text-content-primary font-bold',
  neutral: 'text-content-secondary',
}

interface BusinessSummaryProps {
  rows: BusinessSummaryRow[]
  businessName?: string
}

export function BusinessSummary({ rows, businessName = 'Fernando ADS' }: BusinessSummaryProps) {
  const totalRow = rows.find((r) => r.type === 'total')

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-content-primary">Resumen — {businessName}</h3>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const isTotal = row.type === 'total'
          return (
            <div
              key={i}
              className={cn(
                'flex items-center justify-between gap-3 py-1.5',
                isTotal && 'border-t border-base-border mt-1 pt-3',
              )}
            >
              <span className={cn('text-sm', isTotal ? 'text-content-primary font-semibold' : 'text-content-muted')}>
                {row.label}
              </span>
              <span
                className={cn(
                  'text-sm tabular-nums',
                  isTotal ? 'text-base font-bold' : '',
                  rowColors[row.type],
                )}
              >
                {row.value}
              </span>
            </div>
          )
        })}
      </div>

      {totalRow && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-medium text-center',
            totalRow.rawValue >= 0
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400',
          )}
        >
          Beneficio neto del mes: {totalRow.value}
        </div>
      )}
    </div>
  )
}
