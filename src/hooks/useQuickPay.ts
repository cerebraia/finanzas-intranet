import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SupabaseRPCError } from '@/lib/rpcError'
import { debtsService } from '@/services/debts.service'
import { receivablesService } from '@/services/receivables.service'
import { payrollService } from '@/services/payroll.service'
import { recurringExpensesService } from '@/services/recurringExpenses.service'
import { formatCurrency } from '@/lib/utils'
import type { PendingItem } from '@/types/api'

const RPC_BY_SOURCE: Record<string, string> = {
  DEBT:              'register_debt_payment',
  RECEIVABLE:        'register_client_payment',
  PAYROLL:           'register_payroll_payment',
  RECURRING_EXPENSE: 'pay_recurring_expense',
}

function logQuickPayError(sourceType: string, entityId: string, err: unknown): void {
  if (!import.meta.env.DEV) return
  const base = { sourceType, entityId, rpc: RPC_BY_SOURCE[sourceType] ?? sourceType }
  if (err instanceof SupabaseRPCError) {
    console.error('[QuickPay]', {
      ...base,
      code:    err.code,
      message: err.message,
      details: err.details,
      hint:    err.hint,
    })
  } else if (err instanceof Error) {
    console.error('[QuickPay]', { ...base, message: err.message })
  } else {
    console.error('[QuickPay]', { ...base, raw: err })
  }
}

export function useQuickPay() {
  const qc = useQueryClient()

  async function quickPay(item: PendingItem): Promise<void> {
    const { entityId, workspaceId, sourceType, pendingAmount } = item
    const paymentDate    = new Date().toISOString().slice(0, 10)
    const idempotencyKey = crypto.randomUUID()
    const label  = sourceType === 'RECEIVABLE' ? 'Cobro' : 'Pago'
    const amount = formatCurrency(pendingAmount)

    try {

      if (sourceType === 'DEBT') {
        const { data: instRow, error: instErr } = await supabase
          .from('debt_installments')
          .select('debt_id')
          .eq('id', entityId)
          .single()
        if (instErr) throw new SupabaseRPCError(instErr)
        const { debt_id: debtId } = instRow as { debt_id: string }

        const result = await debtsService.registerPayment(entityId, {
          workspaceId,
          debtId,
          installmentId: entityId,
          amount:         pendingAmount,
          paymentDate,
          idempotencyKey,
        })
        const paymentId = (result.payment as { id: string }).id

        qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
        qc.invalidateQueries({ queryKey: ['pending-items'] })
        qc.invalidateQueries({ queryKey: ['commitment-summary'] })
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })

        toast.success(`${label} de ${amount} registrado`, {
          duration: 6000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              try {
                await debtsService.cancelPayment(paymentId, workspaceId)
                qc.invalidateQueries({ queryKey: ['debts', workspaceId] })
                qc.invalidateQueries({ queryKey: ['pending-items'] })
                qc.invalidateQueries({ queryKey: ['commitment-summary'] })
                qc.invalidateQueries({ queryKey: ['transactions'] })
                qc.invalidateQueries({ queryKey: ['dashboard'] })
                toast.success('Pago revertido')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'No se pudo revertir el pago')
              }
            },
          },
        })
        return
      }

      if (sourceType === 'RECEIVABLE') {
        const { data: recRow, error: recErr } = await supabase
          .from('receivables')
          .select('client_id')
          .eq('id', entityId)
          .single()
        if (recErr) throw new SupabaseRPCError(recErr)
        const { client_id: clientId } = recRow as { client_id: string }

        const result = await receivablesService.registerPayment(entityId, {
          workspaceId,
          clientId,
          amount:         pendingAmount,
          paymentDate,
          idempotencyKey,
        })
        const paymentId = (result.payment as { id: string }).id

        qc.invalidateQueries({ queryKey: ['receivables'] })
        qc.invalidateQueries({ queryKey: ['client-receivables'] })
        qc.invalidateQueries({ queryKey: ['client-payments'] })
        qc.invalidateQueries({ queryKey: ['client-profitability'] })
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['business'] })
        qc.invalidateQueries({ queryKey: ['pending-items'] })

        toast.success(`${label} de ${amount} registrado`, {
          duration: 6000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              try {
                await receivablesService.cancelPayment(paymentId, workspaceId)
                qc.invalidateQueries({ queryKey: ['receivables'] })
                qc.invalidateQueries({ queryKey: ['client-receivables'] })
                qc.invalidateQueries({ queryKey: ['client-payments'] })
                qc.invalidateQueries({ queryKey: ['client-profitability'] })
                qc.invalidateQueries({ queryKey: ['transactions'] })
                qc.invalidateQueries({ queryKey: ['dashboard'] })
                qc.invalidateQueries({ queryKey: ['business'] })
                qc.invalidateQueries({ queryKey: ['pending-items'] })
                toast.success('Pago revertido')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'No se pudo revertir el pago')
              }
            },
          },
        })
        return
      }

      if (sourceType === 'PAYROLL') {
        const result = await payrollService.payObligationById(entityId, workspaceId, {
          amount:         pendingAmount,
          paymentDate,
          idempotencyKey,
        })
        const paymentId = ((result as { payment: { id: string } }).payment).id

        qc.invalidateQueries({ queryKey: ['payroll-obligations'] })
        qc.invalidateQueries({ queryKey: ['payroll-summary'] })
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['pending-items'] })
        qc.invalidateQueries({ queryKey: ['commitment-summary'] })

        toast.success(`${label} de ${amount} registrado`, {
          duration: 6000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              try {
                await payrollService.cancelPayment(paymentId, workspaceId)
                qc.invalidateQueries({ queryKey: ['payroll-obligations'] })
                qc.invalidateQueries({ queryKey: ['payroll-summary'] })
                qc.invalidateQueries({ queryKey: ['transactions'] })
                qc.invalidateQueries({ queryKey: ['dashboard'] })
                qc.invalidateQueries({ queryKey: ['pending-items'] })
                qc.invalidateQueries({ queryKey: ['commitment-summary'] })
                toast.success('Pago revertido')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'No se pudo revertir el pago')
              }
            },
          },
        })
        return
      }

      if (sourceType === 'RECURRING_EXPENSE') {
        await recurringExpensesService.payObligationById(entityId, workspaceId, {
          paymentDate,
        })

        qc.invalidateQueries({ queryKey: ['pending-items'] })
        qc.invalidateQueries({ queryKey: ['recurring-expenses'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['commitment-summary'] })

        toast.success(`${label} de ${amount} registrado`)
        return
      }

      throw new Error(`Tipo de pago no soportado: ${sourceType}`)

    } catch (err) {
      logQuickPayError(sourceType, entityId, err)
      throw err
    }
  }

  return { quickPay }
}
