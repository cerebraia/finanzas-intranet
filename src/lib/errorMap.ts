const PG_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Este registro ya existe.',
  '23503': 'No se puede realizar esta acción porque hay registros relacionados.',
  '23514': 'Los datos no cumplen las restricciones requeridas.',
  '42501': 'No tienes permisos para realizar esta acción.',
  'PGRST116': 'No se encontró el registro solicitado.',
}

const KEYWORD_MESSAGES: [string, string][] = [
  ['excede el saldo pendiente', 'El monto excede el saldo pendiente.'],
  ['ya está cerrada', 'Esta operación ya fue completada o cancelada.'],
  ['ya está completamente pagada', 'Esta obligación ya está completamente pagada.'],
  ['No autenticado', 'Tu sesión expiró. Por favor inicia sesión nuevamente.'],
  ['Sin acceso a este workspace', 'No tienes acceso a este espacio de trabajo.'],
  ['La transferencia ya está cancelada', 'Esta transferencia ya fue cancelada.'],
  ['fetch', 'No pudimos conectar con el servidor. Verifica tu conexión.'],
  ['network', 'No pudimos conectar con el servidor. Verifica tu conexión.'],
  ['Failed to fetch', 'No pudimos conectar con el servidor. Verifica tu conexión.'],
]

export function mapSupabaseError(err: unknown): string {
  if (!err) return 'Ocurrió un error inesperado.'
  const message = err instanceof Error ? err.message : String(err)

  // Check PG error codes
  const codeMatch = message.match(/^([A-Z0-9]{5}):/)
  if (codeMatch && PG_CODE_MESSAGES[codeMatch[1]]) {
    return PG_CODE_MESSAGES[codeMatch[1]]
  }

  // Check keywords
  for (const [keyword, friendly] of KEYWORD_MESSAGES) {
    if (message.toLowerCase().includes(keyword.toLowerCase())) {
      return friendly
    }
  }

  // Generic fallback - don't expose raw DB messages
  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return 'Este registro ya existe.'
  }
  if (message.includes('violates') || message.includes('constraint')) {
    return 'Los datos ingresados no son válidos.'
  }
  if (message.includes('permission') || message.includes('policy')) {
    return 'No tienes permisos para realizar esta acción.'
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}
