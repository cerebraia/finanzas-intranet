import { useState, useRef } from 'react'
import { FileSpreadsheet, CheckCircle2, AlertTriangle, Eye, Play, Loader2 } from 'lucide-react'
import { PageHeader, Card } from '@/components/ui'
import { useWorkspace }     from '@/context/WorkspaceContext'
import { useAccounts }      from '@/hooks/useAccounts'
import { useCategories }    from '@/hooks/useCategories'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ParsedRow {
  rowIndex:    number
  date:        string | null
  description: string | null
  amount:      number | null
  type:        'INCOME' | 'EXPENSE' | null
  category:    string | null
  account:     string | null
  reference:   string | null
  status:      'OK' | 'DUPLICATE' | 'REVIEW_REQUIRED' | 'ERROR'
  warnings:    string[]
}

interface ImportPreview {
  fileName:    string
  fileHash:    string
  totalRows:   number
  incomeRows:  number
  expenseRows: number
  reviewRows:  number
  errorRows:   number
  rows:        ParsedRow[]
  isDuplicate: boolean
}

const ROW_STATUS_CLS = {
  OK:               'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REVIEW_REQUIRED:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  ERROR:            'bg-red-500/10 text-red-400 border-red-500/20',
  DUPLICATE:        'bg-base-elevated text-content-disabled border-base-border',
}

export function ImportPage() {
  const { activeWorkspace }    = useWorkspace()
  const wsId                   = activeWorkspace.id

  const [preview,      setPreview]      = useState<ImportPreview | null>(null)
  const [accountId,    setAccountId]    = useState('')
  const [categoryId,   setCategoryId]   = useState('')
  const [skipReview,   setSkipReview]   = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [result,       setResult]       = useState<{ imported: number; skipped: number; errors: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: accounts   = [] } = useAccounts(wsId)
  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

  async function handleFile(file: File) {
    setLoading(true)
    setPreview(null)
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      const res = await fetch('/api/import/preview', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ workspaceId: wsId, fileBase64: base64, fileName: file.name }),
      })
      if (!res.ok) throw new Error('Error al procesar el archivo')
      const data: ImportPreview = await res.json()
      setPreview(data)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!preview || !accountId || !categoryId) {
      toast.error('Selecciona cuenta y categoría antes de importar')
      return
    }
    setImporting(true)
    try {
      const res = await fetch('/api/import/execute', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview, workspaceId: wsId, accountId, categoryId, skipReview }),
      })
      if (!res.ok) throw new Error('Error al importar')
      const data = await res.json()
      setResult(data)
      toast.success(`${data.imported} transacciones importadas`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const inputCls = cn(
    'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
    'text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-600 transition-colors'
  )

  return (
    <div className="space-y-5 pb-20 md:pb-0 max-w-4xl">
      <PageHeader
        title="Importar histórico"
        description="Migra datos desde Excel o CSV al sistema"
      />

      {/* Upload zone */}
      <Card className="p-6">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="border-2 border-dashed border-base-border rounded-xl p-10 text-center cursor-pointer hover:border-brand-600/50 hover:bg-brand-600/5 transition-all"
        >
          {loading ? (
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          ) : (
            <FileSpreadsheet className="w-8 h-8 text-content-disabled mx-auto mb-3" />
          )}
          <p className="text-sm font-semibold text-content-primary">
            {loading ? 'Procesando archivo...' : 'Arrastra tu Excel aquí o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-content-muted mt-1">Formatos: .xlsx, .xls, .csv</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </Card>

      {/* Preview */}
      {preview && (
        <>
          {preview.isDuplicate ? (
            <Card className="p-5">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">Archivo ya importado</p>
                  <p className="text-xs text-content-muted">Este archivo ya fue procesado anteriormente. No se importará de nuevo.</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total filas',  value: preview.totalRows,   icon: Eye,          color: 'text-content-primary' },
                  { label: 'Ingresos',     value: preview.incomeRows,  icon: CheckCircle2, color: 'text-emerald-400' },
                  { label: 'Gastos',       value: preview.expenseRows, icon: CheckCircle2, color: 'text-red-400' },
                  { label: 'Revisar',      value: preview.reviewRows,  icon: AlertTriangle, color: 'text-amber-400' },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border border-base-border bg-base-surface p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted mb-1">{k.label}</p>
                    <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Config */}
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-content-primary">Configuración de importación</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1.5 block">Cuenta destino *</label>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className={inputCls}>
                      <option value="">Seleccionar cuenta</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1.5 block">Categoría por defecto *</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                      <option value="">Seleccionar categoría</option>
                      {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={skipReview} onChange={e => setSkipReview(e.target.checked)} className="accent-brand-600" />
                  <span className="text-sm text-content-muted">Omitir filas con advertencias (solo importar filas OK)</span>
                </label>
              </Card>

              {/* Rows preview */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-base-border">
                  <p className="text-sm font-semibold text-content-primary">Vista previa de filas</p>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-base-surface">
                      <tr className="border-b border-base-border">
                        {['#','Fecha','Descripción','Monto','Tipo','Estado'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-content-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-border">
                      {preview.rows.slice(0, 50).map(row => (
                        <tr key={row.rowIndex} className="hover:bg-base-hover">
                          <td className="px-3 py-2 text-content-disabled">{row.rowIndex}</td>
                          <td className="px-3 py-2 text-content-secondary">{row.date ? formatDate(row.date) : '—'}</td>
                          <td className="px-3 py-2 text-content-primary max-w-[200px] truncate">{row.description ?? '—'}</td>
                          <td className="px-3 py-2 tabular-nums font-medium">
                            {row.amount ? (
                              <span className={row.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}>
                                {row.type === 'INCOME' ? '+' : '-'}{formatCurrency(row.amount)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-content-muted">{row.type ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={cn('px-1.5 py-0.5 rounded border text-[9px] font-medium', ROW_STATUS_CLS[row.status])}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 50 && (
                    <p className="text-xs text-content-muted text-center py-3">
                      Mostrando 50 de {preview.rows.length} filas
                    </p>
                  )}
                </div>
              </Card>

              {/* Import button */}
              <button
                onClick={handleImport}
                disabled={importing || !accountId || !categoryId}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                  : <><Play className="w-4 h-4" /> Importar {preview.rows.filter(r => r.status === 'OK').length} registros</>
                }
              </button>
            </>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-semibold text-content-primary">Importación completada</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Importados', value: result.imported, color: 'text-emerald-400' },
              { label: 'Omitidos',   value: result.skipped,  color: 'text-amber-400' },
              { label: 'Errores',    value: result.errors,   color: 'text-red-400' },
            ].map(k => (
              <div key={k.label}>
                <p className="text-xs text-content-muted mb-1">{k.label}</p>
                <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
