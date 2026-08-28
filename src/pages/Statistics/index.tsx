import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { PageHeader, Card, Skeleton } from '@/components/ui'
import { formatCurrency, cn } from '@/lib/utils'
import { useWorkspace }            from '@/context/WorkspaceContext'
import { useCashflowSeries, useProjections, useFinancialSummary } from '@/hooks/useAnalytics'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1625', border: '1px solid #2d2547', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#c4b5fd', fontWeight: 600 },
}
const fmtCurrency = (v: unknown) => typeof v === 'number' ? formatCurrency(v) : String(v ?? '')

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function StatisticsPage() {
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace.id
  const year = new Date().getFullYear()

  const ytdFrom = new Date(year, 0, 1)
  const ytdTo   = new Date()

  const { data: cashflow = [], isLoading: loadCf } = useCashflowSeries(wsId, year)
  const { data: ytdSummary, isLoading: loadSum }    = useFinancialSummary(wsId, ytdFrom, ytdTo)
  const { data: projections = [] }                  = useProjections(wsId, 6)
  const [projMonths, setProjMonths] = useState<3 | 6 | 12>(6)

  const barData = cashflow.map(c => ({
    mes: MONTHS_SHORT[c.monthNum - 1],
    Ingresos: c.income,
    Gastos:   c.expenses,
  }))

  const today = new Date()
  const projData = [
    ...cashflow.filter(c => new Date(year, c.monthNum - 1, 1) <= today).map(c => ({
      label:      MONTHS_SHORT[c.monthNum - 1],
      real:       c.income,
      proyectado: null as number | null,
    })),
    ...projections.slice(0, projMonths).map(p => ({
      label:      p.periodLabel,
      real:       null as number | null,
      proyectado: p.income,
    })),
  ]

  const dataMonths    = cashflow.filter(c => c.income > 0 || c.expenses > 0)
  const totalIngresos = cashflow.reduce((s, c) => s + c.income,   0)
  const totalGastos   = cashflow.reduce((s, c) => s + c.expenses, 0)
  const avgIngresos   = dataMonths.length > 0 ? totalIngresos / dataMonths.length : 0

  if (loadCf || loadSum) return (
    <div className="space-y-5">
      <PageHeader title="Estadísticas" description={`Análisis financiero — ${year}`} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <PageHeader title="Estadísticas" description={`Análisis financiero — ${year}`} />

      {/* KPIs YTD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos YTD',  value: formatCurrency(totalIngresos),                    color: 'text-emerald-400' },
          { label: 'Gastos YTD',    value: formatCurrency(totalGastos),                      color: 'text-red-400' },
          { label: 'Balance YTD',   value: formatCurrency(totalIngresos - totalGastos),      color: totalIngresos >= totalGastos ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Promedio/mes',  value: formatCurrency(avgIngresos),                      color: 'text-content-primary' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
            <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tasa de ahorro */}
      {ytdSummary && (
        <Card className="p-4 flex items-center gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">Tasa de ahorro YTD</p>
            <p className={cn('text-2xl font-bold tabular-nums mt-1',
              ytdSummary.savingsRate != null && ytdSummary.savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {ytdSummary.savingsRate != null ? `${ytdSummary.savingsRate.toFixed(1)}%` : '—'}
            </p>
          </div>
          {ytdSummary.savingsRate != null && (
            <div className="flex-1 h-3 rounded-full bg-base-elevated overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', ytdSummary.savingsRate >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                style={{ width: `${Math.min(Math.abs(ytdSummary.savingsRate), 100)}%` }}
              />
            </div>
          )}
          <p className="text-xs text-content-disabled whitespace-nowrap">((Ing − Gast) / Ing) × 100</p>
        </Card>
      )}

      {/* Flujo mensual */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4">Ingresos vs Gastos — {year}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barSize={12} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2547" />
            <XAxis dataKey="mes" tick={{ fill: '#8b7aad', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b7aad', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={fmtCurrency} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#c4b5fd' }} />
            <Bar dataKey="Ingresos" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos"   fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Proyección */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">Proyección de ingresos</h3>
            <p className="text-[10px] text-content-disabled mt-0.5">Estimación basada en tu promedio reciente. No es una predicción garantizada.</p>
          </div>
          <div className="flex gap-1">
            {([3, 6, 12] as const).map(m => (
              <button key={m} onClick={() => setProjMonths(m)}
                className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  projMonths === m ? 'bg-brand-600 text-white' : 'border border-base-border text-content-muted hover:text-content-primary'
                )}>
                {m}m
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2547" />
            <XAxis dataKey="label" tick={{ fill: '#8b7aad', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8b7aad', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={fmtCurrency} />
            <Line dataKey="real"       name="Real"       stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} connectNulls={false} />
            <Line dataKey="proyectado" name="Proyectado" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: '#a78bfa', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Balance mensual + situación actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">Balance mensual</h3>
          <div className="space-y-3">
            {dataMonths.length === 0
              ? <p className="text-sm text-content-muted text-center py-4">Sin datos anuales todavía.</p>
              : dataMonths.map(c => {
                  const pct = c.income > 0 ? Math.min((c.balance / c.income) * 100, 100) : 0
                  return (
                    <div key={c.monthNum} className="flex items-center gap-3">
                      <span className="text-xs text-content-muted w-8">{MONTHS_SHORT[c.monthNum - 1]}</span>
                      <div className="flex-1 h-2 rounded-full bg-base-elevated overflow-hidden">
                        <div className={cn('h-full rounded-full', c.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                          style={{ width: `${Math.abs(pct)}%` }} />
                      </div>
                      <span className={cn('text-xs font-semibold tabular-nums w-24 text-right', c.balance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(c.balance)}
                      </span>
                    </div>
                  )
                })}
          </div>
        </Card>

        {ytdSummary && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-content-primary mb-4">Situación actual</h3>
            <div className="space-y-3">
              {[
                { label: 'Disponible',          amount: ytdSummary.availableCash,   color: 'bg-emerald-500' },
                { label: 'Comprometido',         amount: ytdSummary.committed,        color: 'bg-amber-500' },
                { label: 'Deuda pendiente',      amount: ytdSummary.totalDebt,        color: 'bg-red-500' },
                { label: 'Compras planificadas', amount: ytdSummary.plannedPurchases, color: 'bg-purple-500' },
              ].map(row => {
                const max = Math.max(ytdSummary.availableCash + ytdSummary.committed + ytdSummary.totalDebt, 1)
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-content-muted">{row.label}</span>
                      <span className="font-semibold text-content-primary tabular-nums">{formatCurrency(row.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-base-elevated overflow-hidden">
                      <div className={cn('h-full rounded-full', row.color)}
                        style={{ width: `${Math.min((row.amount / max) * 100, 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
