import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { debtsService } from '@/services/debts.service'
import { receivablesService } from '@/services/receivables.service'
import { payrollService } from '@/services/payroll.service'
import { recurringExpensesService } from '@/services/recurringExpenses.service'
import { formatCurrency } from '@/lib/utils'
import type { PendingItem } from '@/types/api'

export function useQuickPay() {
  const qc = useQueryClient()

  async function quickPay(item: PendingItem): Promise<void> {
    const { entityId, workspaceId, sourceType, pendingAmount } = item
    const paymentDate    = new Date().toISOString().slice(0, 10)
    const idempotencyKey = crypto.randomUUID()
    const label  = sourceType === 'RECEIVABLE' ? 'Cobro' : 'Pago'
    const amount = formatCurrency(pendingAmount)

    if (sourceType === 'DEBT') {
      const { data: instRow, error: instErr } = await supabase
        .from('debt_installments')
        .select('debt_id')
        .eq('id', entityId)
        .single()
      if (instErr) throw new Error(instErr.message)
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
      if (recErr) throw new Error(recErr.message)
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
  }

  return { quickPay }
}
