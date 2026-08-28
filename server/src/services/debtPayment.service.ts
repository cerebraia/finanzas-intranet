import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import { computeInstallmentStatus } from './debt.service.js'

interface RegisterDebtPaymentInput {
  workspaceId:   string
  debtId:        string
  installmentId: string
  accountId:     string
  amount:        number
  paymentDate:   string
  reference?:    string
  notes?:        string
  categoryId:    string
}

export const debtPaymentService = {
  async register(input: RegisterDebtPaymentInput) {
    const { workspaceId, debtId, installmentId, accountId, amount, paymentDate, reference, notes, categoryId } = input

    const debt        = await prisma.debt.findFirstOrThrow({ where: { id: debtId, workspaceId } })
    const installment = await prisma.debtInstallment.findFirstOrThrow({
      where:   { id: installmentId, debtId },
      include: { debt: { select: { name: true } } },
    })

    const pending = Number(new Decimal(installment.amount).minus(installment.amountPaid))
    if (amount <= 0) throw Object.assign(new Error('El monto debe ser mayor a 0'), { status: 400 })
    if (amount > pending + 0.001) {
      throw Object.assign(
        new Error(`El monto ($${amount}) supera el pendiente ($${pending.toFixed(2)})`),
        { status: 400 }
      )
    }

    const newAmountPaid = new Decimal(installment.amountPaid).plus(amount)
    const newStatusDb   = newAmountPaid.greaterThanOrEqualTo(installment.amount) ? 'PAID' : 'PARTIAL'

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId,
          categoryId,
          type:            'EXPENSE',
          status:          'COMPLETED',
          amount,
          description:     `Cuota ${installment.number} — ${debt.name}`,
          transactionDate: new Date(paymentDate),
          reference,
          notes,
        },
      })

      const payment = await tx.debtPayment.create({
        data: {
          workspaceId,
          debtId,
          installmentId,
          accountId,
          amount,
          paymentDate:   new Date(paymentDate),
          reference,
          notes,
          transactionId: transaction.id,
        },
      })

      const updatedInstallment = await tx.debtInstallment.update({
        where: { id: installmentId },
        data:  { amountPaid: newAmountPaid, status: newStatusDb },
      })

      // Update debt status if all installments are paid
      const allInstallments = await tx.debtInstallment.findMany({
        where:  { debtId },
        select: { status: true },
      })
      const allPaid = allInstallments.every(i => i.status === 'PAID')
      if (allPaid) {
        await tx.debt.update({ where: { id: debtId }, data: { status: 'PAID' } })
      }

      return {
        payment,
        installment: {
          ...updatedInstallment,
          status: computeInstallmentStatus(
            updatedInstallment.status,
            updatedInstallment.dueDate,
            updatedInstallment.amountPaid,
            updatedInstallment.amount,
          ),
        },
        transaction,
      }
    })
  },

  async cancel(paymentId: string, workspaceId: string) {
    const payment = await prisma.debtPayment.findFirstOrThrow({
      where: { id: paymentId, workspaceId, cancelled: false },
    })

    const installment = await prisma.debtInstallment.findUniqueOrThrow({
      where: { id: payment.installmentId },
    })

    return prisma.$transaction(async (tx) => {
      await tx.debtPayment.update({ where: { id: paymentId }, data: { cancelled: true } })

      if (payment.transactionId) {
        await tx.transaction.update({
          where: { id: payment.transactionId },
          data:  { status: 'CANCELLED' },
        })
      }

      const newAmountPaid = new Decimal(installment.amountPaid).minus(payment.amount)
      const clampedPaid   = newAmountPaid.lessThan(0) ? new Decimal(0) : newAmountPaid
      const newStatus     = clampedPaid.isZero() ? 'PENDING'
        : clampedPaid.lessThan(installment.amount) ? 'PARTIAL' : 'PAID'

      await tx.debtInstallment.update({
        where: { id: installment.id },
        data:  { amountPaid: clampedPaid, status: newStatus },
      })

      // Reopen debt if it was marked PAID
      await tx.debt.update({
        where: { id: payment.debtId },
        data:  { status: 'ACTIVE' },
      })

      return { cancelled: true }
    })
  },

  async findByDebt(debtId: string, workspaceId: string) {
    await prisma.debt.findFirstOrThrow({ where: { id: debtId, workspaceId } })
    return prisma.debtPayment.findMany({
      where:   { debtId, cancelled: false },
      include: {
        account:     { select: { id: true, name: true } },
        installment: { select: { id: true, number: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })
  },
}
