import { useState, useRef } from 'react'
import { Check, Shield, LogOut, Edit2, Camera, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, Card, Badge } from '@/components/ui'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/auth'

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Administrador',
  MANAGER:     'Manager',
  EMPLOYEE:    'Empleado',
  VIEWER:      'Viewer',
}

const ROLE_VARIANT: Record<UserRole, 'danger' | 'success' | 'warning' | 'info' | 'default'> = {
  SUPER_ADMIN: 'danger',
  ADMIN:       'info',
  MANAGER:     'warning',
  EMPLOYEE:    'default',
  VIEWER:      'default',
}

const ROLE_PERMISSIONS_DISPLAY: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['Acceso total', 'Gestión de usuarios', 'Configuración avanzada', 'Eliminar cualquier registro'],
  ADMIN:       ['Gestión financiera completa', 'Clientes y equipo', 'Configuración', 'Eliminar registros'],
  MANAGER:     ['Ver clientes y reportes', 'Registrar transacciones', 'Ver movimientos'],
  EMPLOYEE:    ['Ver dashboard', 'Ver ingresos y gastos'],
  VIEWER:      ['Ver dashboard', 'Ver calendario', 'Ver estadísticas'],
}

const MAX_SIZE_MB = 2

export function ProfilePage() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editing,      setEditing]      = useState(false)
  const [firstName,    setFirstName]    = useState(user?.firstName ?? '')
  const [lastName,     setLastName]     = useState(user?.lastName  ?? '')
  const [saved,        setSaved]        = useState(false)
  const [uploadingAvatar, setUploading] = useState(false)

  async function handleSave() {
    await updateProfile({ first_name: firstName, last_name: lastName })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }

    // Validar tamaño
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`La imagen no puede superar ${MAX_SIZE_MB} MB`)
      return
    }

    setUploading(true)
    try {
      const ext      = file.name.split('.').pop() ?? 'jpg'
      const path     = `${user.id}/avatar.${ext}`

      // Subir (upsert reemplaza si ya existe)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Obtener URL pública con cache-busting
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      await updateProfile({ avatar_url: publicUrl })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error('Error al subir la imagen')
      console.error(err)
    } finally {
      setUploading(false)
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return
    setUploading(true)
    try {
      // Quitar URL del perfil (no borramos el archivo en Storage para evitar errores)
      await updateProfile({ avatar_url: null })
      toast.success('Foto eliminada')
    } finally {
      setUploading(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-5 pb-20 md:pb-0 max-w-2xl">
      <PageHeader title="Mi Perfil" description="Información de tu cuenta y permisos" />

      {/* Avatar + info */}
      <Card className="p-6">
        <div className="flex items-start gap-4">

          {/* Avatar con botón de cámara */}
          <div className="relative flex-shrink-0 group">
            <UserAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              size="lg"
              className="rounded-2xl"
            />

            {/* Overlay de cámara */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className={cn(
                'absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1',
                'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                'text-white text-[10px] font-medium',
                uploadingAvatar && 'opacity-100 cursor-not-allowed',
              )}
              title="Cambiar foto de perfil"
            >
              {uploadingAvatar
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <><Camera className="w-5 h-5" /><span>Cambiar</span></>
              }
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-content-primary">{user.firstName} {user.lastName}</p>
              <Badge variant={ROLE_VARIANT[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            </div>
            <p className="text-sm text-content-muted mt-0.5">{user.email}</p>
            <p className="text-xs text-content-disabled mt-0.5">ID: {user.id}</p>

            {/* Botón eliminar foto (solo visible si hay avatar) */}
            {user.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="mt-2 text-xs text-content-disabled hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Eliminar foto
              </button>
            )}
          </div>

          <button
            onClick={() => setEditing(v => !v)}
            className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors flex-shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-5 pt-5 border-t border-base-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-content-muted mb-1.5 block">Nombre</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1.5 block">Apellido</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <Check className="w-4 h-4" /> Perfil actualizado
          </div>
        )}
      </Card>

      {/* Permisos del rol */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-content-primary">Permisos de {ROLE_LABEL[user.role]}</h3>
        </div>
        <ul className="space-y-2">
          {ROLE_PERMISSIONS_DISPLAY[user.role].map(perm => (
            <li key={perm} className="flex items-center gap-2 text-sm text-content-secondary">
              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              {perm}
            </li>
          ))}
        </ul>
      </Card>

      {/* Cuenta */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4">Cuenta</h3>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Estado',   value: user.status === 'ACTIVE' ? 'Activo' : 'Inactivo' },
            { label: 'Workspace', value: user.workspaceId },
            { label: 'Creado',   value: new Date(user.createdAt).toLocaleDateString('es-ES') },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-1.5 border-b border-base-border/50 last:border-0">
              <span className="text-content-muted">{row.label}</span>
              <span className="text-content-primary font-medium truncate max-w-[60%] text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  )
}
