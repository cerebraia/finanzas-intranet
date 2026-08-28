import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import type { ExpenseCategory } from '@/types'

interface PieTooltipEntry {
  name: string
  value: number
}

interface PieTooltipProps {
  active?: boolean
  payload?: PieTooltipEntry[]
}

function CustomTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-base-elevated border border-base-border rounded-lg px-3 py-2 shadow-glow text-sm">
      <p className="text-content-primary font-semibold">{name}</p>
      <p className="text-content-muted">${Number(value).toLocaleString()}</p>
    </div>
  )
}

interface ExpenseDistributionChartProps {
  data: ExpenseCategory[]
}

export function ExpenseDistributionChart({ data }: ExpenseDistributionChartProps) {
  const total = data.reduce((s, c) => s + c.value, 0)

  return (
    <div className="rounded-xl border border-base-border bg-base-surface p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PieIcon className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-content-primary">Distribución de gastos</h3>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <ul className="flex-1 space-y-2 min-w-0">
          {data.map((cat) => {
            const pct = total > 0 ? ((cat.value / total) * 100).toFixed(0) : '0'
            return (
              <li key={cat.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-content-muted truncate flex-1">{cat.name}</span>
                <span className="text-xs font-semibold text-content-secondary tabular-nums flex-shrink-0">
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="pt-2 border-t border-base-border flex justify-between items-center">
        <span className="text-xs text-content-muted">Total gastos</span>
        <span className="text-sm font-bold text-content-primary tabular-nums">
          ${total.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
