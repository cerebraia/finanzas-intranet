export class SupabaseRPCError extends Error {
  readonly code:    string | undefined
  readonly details: string | undefined
  readonly hint:    string | undefined

  constructor(err: { message: string; code?: string | null; details?: string | null; hint?: string | null }) {
    super(err.message)
    this.name    = 'SupabaseRPCError'
    this.code    = err.code    ?? undefined
    this.details = err.details ?? undefined
    this.hint    = err.hint    ?? undefined
  }
}
