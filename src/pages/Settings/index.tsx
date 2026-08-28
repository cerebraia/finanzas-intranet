import { useState, useRef } from 'react'
import { Check, Download, Upload, FileText, Database, Zap, Monitor, AlertTriangle, RefreshCw } from 'lucide-react'
import { PageHeader, Card, ConfirmDialog } from '@/components/ui'
import { useApp } from '@/context/AppContext'
import { STORAGE_KEYS } from '@/lib/storage'
import { cn } from '@/lib/utils'

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

interface UserPrefs {
  displayName:       string
  currency:          string
  notifEnabled:      boolean
  defaultWorkspace:  string
}

const DEFAULT_PREFS: UserPrefs = {
  displayName:       'Fernando',
  currency:          'USD',
  notifEnabled:      true,
  defaultWorkspace:  'personal',
}

function loadPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.userPrefs)
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

function exportBackup(): void {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: '2',
  }
  // Only export user preferences, not financial data
  try { data[STORAGE_KEYS.userPrefs] = JSON.parse(localStorage.getItem(STORAGE_KEYS.userPrefs) ?? 'null') }
  catch { data[STORAGE_KEYS.userPrefs] = null }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `finanzas-preferencias-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

interface BackupPreview {
  hasPrefs: boolean
  raw:      Record<string, unknown>
}

export function SettingsPage() {
  const { focusMode, toggleFocus } = useApp()
  const [prefs, setPrefs]           = useState<UserPrefs>(loadPrefs)
  const [saved, setSaved]           = useState(false)
  const [preview, setPreview]       = useState<BackupPreview | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    localStorage.setItem(STORAGE_KEYS.userPrefs, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function update<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const hasPrefs = raw[STORAGE_KEYS.userPrefs] !== null && raw[STORAGE_KEYS.userPrefs] !== undefined
        setPreview({ hasPrefs, raw })
      } catch {
        alert('El archivo no es válido o está dañado.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleConfirmRestore() {
    if (!preview) return
    const { raw } = preview
    // Only restore user preferences, not financial data
    if (raw[STORAGE_KEYS.userPrefs] !== null && raw[STORAGE_KEYS.userPrefs] !== undefined) {
      localStorage.setItem(STORAGE_KEYS.userPrefs, JSON.stringify(raw[STORAGE_KEYS.userPrefs]))
    }
    setConfirmRestore(false)
    setPreview(null)
    window.location.reload()
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0 max-w-2xl">
      <PageHeader title="Configuración" description="Ajustes y preferencias del sistema" />

      {/* Perfil */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white text-lg font-bold">
            {prefs.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-content-primary">{prefs.displayName}</p>
            <p className="text-xs text-content-muted">Administrador</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Nombre de usuario</label>
          <input value={prefs.displayName} onChange={e => update('displayName', e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Moneda principal</label>
            <select value={prefs.currency} onChange={e => update('currency', e.target.value)} className={inputCls}>
              <option value="USD">USD — Dólar</option>
              <option value="VES">VES — Bolívar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Workspace por defecto</label>
            <select value={prefs.defaultWorkspace} onChange={e => update('defaultWorkspace', e.target.value)} className={inputCls}>
              <option value="personal">Personal</option>
              <option value="fernando-ads">Fernando ADS</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Preferencias */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-content-primary">Preferencias</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-base-border">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-brand-400" />
              <div>
                <p className="text-sm text-content-primary">Modo Enfoque</p>
                <p className="text-xs text-content-muted">Oculta gráficos secundarios y muestra lo esencial</p>
              </div>
            </div>
            <button
              onClick={toggleFocus}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                focusMode ? 'bg-brand-600' : 'bg-base-elevated border-base-border'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200',
                focusMode ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-base-border">
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-brand-400" />
              <div>
                <p className="text-sm text-content-primary">Notificaciones</p>
                <p className="text-xs text-content-muted">Alertas de pagos y vencimientos</p>
              </div>
            </div>
            <button
              onClick={() => update('notifEnabled', !prefs.notifEnabled)}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                prefs.notifEnabled ? 'bg-brand-600' : 'bg-base-elevated border-base-border'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200',
                prefs.notifEnabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>
        </div>
      </Card>

      {/* Datos y backups */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-content-primary">Preferencias de usuario</h3>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              Solo se exportan las preferencias de usuario. Los datos financieros se almacenan en la base de datos del servidor.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportBackup}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-base-border bg-base-elevated text-content-primary hover:bg-base-hover transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar preferencias
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-base-border bg-base-elevated text-content-primary hover:bg-base-hover transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Importar preferencias
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {/* Preview de importación */}
        {preview && (
          <div className="rounded-lg border border-brand-600/30 bg-brand-600/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-content-primary">Vista previa de las preferencias</p>
            <div className="space-y-1.5 text-xs text-content-muted">
              <div className="flex justify-between">
                <span>Preferencias de usuario</span>
                <span className="font-semibold text-content-primary">{preview.hasPrefs ? 'Incluidas' : 'No encontradas'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-1.5 rounded-lg border border-base-border text-xs font-medium text-content-muted hover:bg-base-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setConfirmRestore(true)}
                className="flex-1 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Confirmar restauración
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Exportaciones */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-content-primary">Exportaciones de reportes</h3>
        <p className="text-xs text-content-muted">Disponible al conectar la base de datos.</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'PDF',   icon: FileText },
            { label: 'Excel', icon: Database },
            { label: 'CSV',   icon: Download },
          ].map(ex => (
            <button
              key={ex.label}
              disabled
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-border bg-base-elevated text-content-disabled cursor-not-allowed opacity-50"
            >
              <ex.icon className="w-5 h-5" />
              <span className="text-xs">Exportar {ex.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Estado del sistema */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-content-primary">Estado del sistema</h3>
        <div className="space-y-2">
          {[
            { label: 'Base de datos',   status: 'Pendiente — conectar PostgreSQL', color: 'text-amber-400' },
            { label: 'API backend',     status: 'Sin conexión (modo mock)',         color: 'text-amber-400' },
            { label: 'PWA',             status: 'Instalable',                       color: 'text-emerald-400' },
            { label: 'Versión',         status: 'Hito 11 — Auditoría y estabilización', color: 'text-brand-400' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-content-muted">{row.label}</span>
              <span className={cn('text-xs font-medium', row.color)}>{row.status}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Guardar */}
      <button
        onClick={handleSave}
        className={cn(
          'w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-brand-600 hover:bg-brand-500 text-white'
        )}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Guardado
          </span>
        ) : 'Guardar preferencias'}
      </button>

      <ConfirmDialog
        open={confirmRestore}
        title="Confirmar restauración"
        description="¿Deseas reemplazar los datos actuales con los datos del respaldo? La aplicación se recargará."
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleConfirmRestore}
        onCancel={() => setConfirmRestore(false)}
      />
    </div>
  )
}
