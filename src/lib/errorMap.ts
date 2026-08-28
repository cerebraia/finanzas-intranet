const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Este registro ya existe.',
  '23503': 'El registro relacionado no existe o no puede eliminarse porque tiene datos asociados.',
  '23502': 'Falta completar un campo obligatorio.',
  '23514': 'Los datos ingresados no cumplen las restricciones requeridas.',
  '22P02': 'Formato de datos inválido.',
  '22003': 'El valor numérico está fuera del rango permitido.',
  '42501': 'Tu sesión puede haber expirado. Inicia sesión nuevamente.',
  '42P01': 'Tabla no encontrada. Verifica las migraciones.',
  'PGRST116': 'No se encontró el registro solicitado.',
  'PGRST204': 'No se encontró el registro para actualizar.',
}

const KEYWORD_MESSAGES: [string, string][] = [
  // Financial rules
  ['excede el saldo pendiente',           'El monto supera el saldo pendiente.'],
  ['ya está cerrada',                     'Esta operación ya fue completada o cancelada.'],
  ['ya está completamente pagada',        'Esta obligación ya está completamente pagada.'],
  ['La transferencia ya fue cancelada',   'Esta transferencia ya fue cancelada.'],
  ['La transferencia ya está cancelada',  'Esta transferencia ya fue cancelada.'],
  // Auth / permissions
  ['No autenticado',                      'Tu sesión expiró. Inicia sesión nuevamente.'],
  ['not authenticated',                   'Tu sesión expiró. Inicia sesión nuevamente.'],
  ['JWT expired',                         'Tu sesión expiró. Inicia sesión nuevamente.'],
  ['Invalid JWT',                         'Tu sesión no es válida. Inicia sesión nuevamente.'],
  ['Sin acceso a este workspace',         'No tienes acceso a este espacio de trabajo.'],
  ['permission denied',                   'Tu sesión puede haber expirado. Inicia sesión nuevamente.'],
  // Network
  ['Failed to fetch',                     'No pudimos conectar con el servidor. Verifica tu conexión.'],
  ['fetch',                               'No pudimos conectar con el servidor. Verifica tu conexión.'],
  ['network',                             'No pudimos conectar con el servidor. Verifica tu conexión.'],
  ['NetworkError',                        'No pudimos conectar con el servidor. Verifica tu conexión.'],
  // Data
  ['null value in column',               'Falta completar un campo obligatorio.'],
  ['violates not-null',                   'Falta completar un campo obligatorio.'],
  ['violates foreign key',               'El registro relacionado no existe.'],
  ['duplicate key',                       'Este registro ya existe.'],
  ['unique constraint',                   'Este registro ya existe.'],
  ['already exists',                      'Este registro ya existe.'],
  ['Meta no encontrada',                  'La meta no existe o fue eliminada.'],
  ['Hito no encontrado',                  'El hito no existe o fue eliminado.'],
]

export function mapSupabaseError(err: unknown): string {
  if (!err) return 'Ocurrió un error inesperado.'

  const message = err instanceof Error ? err.message : String(err)

  // Log the raw error in dev for debugging
  if (import.meta.env.DEV) {
    console.error('[Supabase error]', message)
  }

  // Check PG error codes embedded in message
  const codeMatch = message.match(/\b([0-9]{5}|PGRST\d+)\b/)
  if (codeMatch && PG_CODE_MESSAGES[codeMatch[1]]) {
    return PG_CODE_MESSAGES[codeMatch[1]]
  }

  // Check known keyword patterns (case-insensitive)
  for (const [keyword, friendly] of KEYWORD_MESSAGES) {
    if (message.toLowerCase().includes(keyword.toLowerCase())) {
      return friendly
    }
  }

  // Generic structural fallbacks
  if (message.includes('violates') || message.includes('constraint')) {
    return 'Los datos ingresados no son válidos.'
  }
  if (message.includes('permission') || message.includes('policy') || message.includes('denied')) {
    return 'Tu sesión puede haber expirado. Inicia sesión nuevamente.'
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
