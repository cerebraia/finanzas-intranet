import { prisma } from '../lib/prisma.js'
import { Decimal } from '@prisma/client/runtime/library'
import { computeReceivableStatus } from './receivable.service.js'

interface RegisterPaymentInput {
  workspaceId:  string
  clientId:     string
  receivableId: string
  accountId:    string
  amount:       number
  paymentDate:  string
  reference?:   string
  notes?:       string
  // ID de categoría "Clientes" — se resuelve en el controller
  clientsCategoryId: string
}

export const clientPaymentService = {
  async findByClient(clientId: string, workspaceId: string) {
    await prisma.client.findFirstOrThrow({ where: { id: clientId, workspaceId } })
    return prisma.clientPayment.findMany({
      where:   { clientId, workspaceId },
      include: {
        account:    { select: { id: true, name: true } },
        receivable: { select: { id: true, description: true } },
        transaction: { select: { id: true, amount: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })
  },

  async register(input: RegisterPaymentInput) {
    const { workspaceId, clientId, receivableId, accountId, amount, paymentDate, reference, notes, clientsCategoryId } = input

    // 1. Cargar receivable y validar workspace
    const receivable = await prisma.receivable.findFirstOrThrow({
      where: { id: receivableId, workspaceId, clientId },
      include: { client: { select: { name: true } } },
    })

    // 2. Validar que no sobrepase el monto pendiente
    const pending = Number(new Decimal(receivable.amount).minus(receivable.amountPaid))
    if (amount <= 0) throw Object.assign(new Error('El monto debe ser mayor a 0'), { status: 400 })
    if (amount > pending + 0.001) {
      throw Object.assign(
        new Error(`El monto ($${amount}) supera el pendiente ($${pending.toFixed(2)})`),
        { status: 400 }
      )
    }

    // 3. Calcular nuevo amountPaid y status
    const newAmountPaid   = new Decimal(receivable.amountPaid).plus(amount)
    const newStatusDb     = newAmountPaid.greaterThanOrEqualTo(receivable.amount) ? 'PAID' : 'PARTIAL'

    return prisma.$transaction(async (tx) => {
      // 4. Crear Transaction INCOME automáticamente
      const transaction = await tx.transaction.create({
        data: {
          workspaceId,
          accountId,
          categoryId:      clientsCategoryId,
          clientId,
          type:            'INCOME',
          status:          'COMPLETED',
          amount,
          description:     `Pago de ${receivable.client.name} - ${receivable.description}`,
          transactionDate: new Date(paymentDate),
          reference,
          notes,
        },
      })

      // 5. Crear ClientPayment
      const payment = await tx.clientPayment.create({
        data: {
          workspaceId,
          clientId,
          receivableId,
          accountId,
          amount,
          paymentDate:   new Date(paymentDate),
          reference,
          notes,
          transactionId: transaction.id,
        },
      })

      // 6. Actualizar Receivable
      const updatedReceivable = await tx.receivable.update({
        where: { id: receivableId },
        data:  { amountPaid: newAmountPaid, status: newStatusDb },
        include: {
          client:        { select: { id: true, name: true } },
          clientService: { include: { service: { select: { id: true, name: true } } } },
          payments:      { select: { id: true, amount: true, paymentDate: true } },
        },
      })

      return {
        payment,
        receivable: {
          ...updatedReceivable,
          status: computeReceivableStatus(
            updatedReceivable.status,
            updatedReceivable.dueDate,
            updatedReceivable.amountPaid,
            updatedReceivable.amount
          ),
        },
        transaction,
      }
    })
  },
}
