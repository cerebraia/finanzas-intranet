import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { CashFlowData } from '@/types'

interface TooltipEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base-elevated border border-base-border rounded-lg px-3 py-2.5 shadow-glow text-sm">
      <p className="text-content-muted mb-1.5 text-xs font-semibold uppercase tracking-wider">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: ${Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

interface CashFlowChartProps {
  data: CashFlowData[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-content-primary">Flujo de caja</h3>
      </div>

      <div className="h-48 md:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1A2E" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6B6880', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6B6880', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#B8B0D8', paddingTop: '8px' }}
              formatter={(value) => value === 'income' ? 'Ingresos' : 'Gastos'}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="income"
              stroke="#34D399"
              strokeWidth={2}
              dot={{ fill: '#34D399', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="expenses"
              stroke="#F87171"
              strokeWidth={2}
              dot={{ fill: '#F87171', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
