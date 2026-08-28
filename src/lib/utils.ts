import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Convierte un Date a string ISO-date 'YYYY-MM-DD'. */
export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Retorna una etiqueta relativa a hoy: "Hoy", "Mañana", "En N días", o la fecha formateada. */
export function formatRelativeDate(isoDate: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00'); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1 && diff <= 7) return `En ${diff} días`
  if (diff < -1) return `Hace ${Math.abs(diff)} días`
  return formatDate(isoDate)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '¡Buenos días'
  if (hour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
}
