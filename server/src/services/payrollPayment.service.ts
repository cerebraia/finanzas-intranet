import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import type { PayrollObligationStatus } from '@prisma/client'

export function computePayrollStatus(
  status: PayrollObligationStatus,
  dueDate: Date,
  amountPaid: Decimal,
  amount: Decimal,
): PayrollObligationStatus {
  if (status === 'PAID' || status === 'CANCELLED') return status
  const isPastDue = new Date(dueDate) < new Date(new Date().toDateString())
  if (isPastDue) return 'OVERDUE'
  if (amountPaid.greaterThan(0)) return 'PARTIAL'
  return 'PENDING'
}

interface RegisterPayrollPaymentInput {
  workspaceId:        string
  employeeId:         string
  payrollObligationId: string
  accountId:          string
  amount:             number
  paymentDate:        string
  reference?:         string
  notes?:             string
  payrollCategoryId:  string // ID de categoría "Nómina / Equipo"
}

const includeObligation = {
  employee:    { select: { id: true, name: true } },
  payrollRule: { select: { id: true, paymentDay: true } },
  payments:    { where: { cancelled: false }, select: { id: true, amount: true, paymentDate: true } },
}

export const payrollPaymentService = {
  async findObligations(workspaceId: string, params: {
    from?: string; to?: string; status?: string; employeeId?: string
  }) {
    const { from, to, status, employeeId } = params
    const rows = await prisma.payrollObligation.findMany({
      where: {
        workspaceId,
        employeeId: employeeId ?? undefined,
        dueDate:    { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined },
        status:     (status && status !== 'OVERDUE') ? (status as PayrollObligationStatus) : undefined,
      },
      include: includeObligation,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
    const result = rows.map(r => ({
      ...r,
      status: computePayrollStatus(r.status, r.dueDate, r.amountPaid, r.amount),
    }))
    if (status === 'OVERDUE') return result.filter(r => r.status === 'OVERDUE')
    return result
  },

  async findByEmployee(employeeId: string, workspaceId: string) {
    await prisma.employee.findFirstOrThrow({ where: { id: employeeId, workspaceId } })
    const rows = await prisma.payrollObligation.findMany({
      where:   { employeeId, workspaceId },
      include: includeObligation,
      orderBy: { dueDate: 'desc' },
    })
    return rows.map(r => ({
      ...r,
      status: computePayrollStatus(r.status, r.dueDate, r.amountPaid, r.amount),
    }))
  },

  async register(input: RegisterPayrollPaymentInput) {
    const { workspaceId, employeeId, payrollObligationId, accountId, amount, paymentDate, reference, notes, payrollCategoryId } = input

    const obligation = await prisma.payrollObligation.findFirstOrThrow({
      where:   { id: payrollObligationId, workspaceId, employeeId },
      include: { employee: { select: { name: true } } },
    })

    const pending = Number(new Decimal(obligation.amount).minus(obligation.amountPaid))
    if (amount <= 0) throw Object.assign(new Error('El monto debe ser mayor a 0'), { status: 400 })
    if (amount > pending + 0.001) {
      throw Object.assign(
        new Error(`El monto ($${amount}) supera el pendiente ($${pending.toFixed(2)})`),
        { status: 400 }
      )
    }

    const newAmountPaid = new Decimal(obligation.amountPaid).plus(amount)
    const newStatusDb   = newAmountPaid.greaterThanOrEqualTo(obligation.amount) ? 'PAID' : 'PARTIAL'

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId,
          categoryId:      payrollCategoryId,
          type:            'EXPENSE',
          status:          'COMPLETED',
          amount,
          description:     `Pago nómina — ${obligation.employee.name} — ${obligation.description}`,
          transactionDate: new Date(paymentDate),
          reference,
          notes,
        },
      })

      const payment = await tx.payrollPayment.create({
        data: {
          workspaceId,
          employeeId,
          payrollObligationId,
          accountId,
          amount,
          paymentDate:   new Date(paymentDate),
          reference,
          notes,
          transactionId: transaction.id,
        },
      })

      const updatedObligation = await tx.payrollObligation.update({
        where: { id: payrollObligationId },
        data:  { amountPaid: newAmountPaid, status: newStatusDb },
        include: includeObligation,
      })

      return {
        payment,
        obligation: {
          ...updatedObligation,
          status: computePayrollStatus(
            updatedObligation.status,
            updatedObligation.dueDate,
            updatedObligation.amountPaid,
            updatedObligation.amount,
          ),
        },
        transaction,
      }
    })
  },

  async cancel(paymentId: string, workspaceId: string) {
    const payment = await prisma.payrollPayment.findFirstOrThrow({
      where: { id: paymentId, workspaceId, cancelled: false },
    })

    const obligation = await prisma.payrollObligation.findUniqueOrThrow({
      where: { id: payment.payrollObligationId },
    })

    return prisma.$transaction(async (tx) => {
      await tx.payrollPayment.update({ where: { id: paymentId }, data: { cancelled: true } })

      if (payment.transactionId) {
        await tx.transaction.update({
          where: { id: payment.transactionId },
          data:  { status: 'CANCELLED' },
        })
      }

      const newAmountPaid = new Decimal(obligation.amountPaid).minus(payment.amount)
      const clampedPaid   = newAmountPaid.lessThan(0) ? new Decimal(0) : newAmountPaid
      const newStatus = clampedPaid.isZero() ? 'PENDING' :
        clampedPaid.lessThan(obligation.amount) ? 'PARTIAL' : 'PAID'

      await tx.payrollObligation.update({
        where: { id: obligation.id },
        data:  { amountPaid: clampedPaid, status: newStatus },
      })

      return { cancelled: true }
    })
  },
}
