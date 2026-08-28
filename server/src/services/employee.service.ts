import { prisma } from '../lib/prisma.js'
import type { EmployeeStatus } from '@prisma/client'

interface CreateEmployeeInput {
  workspaceId: string
  name: string
  email?: string
  phone?: string
  role?: string
  notes?: string
}

interface UpdateEmployeeInput {
  name?: string
  email?: string
  phone?: string
  role?: string
  status?: EmployeeStatus
  notes?: string
}

interface AddPayrollRuleInput {
  amount: number
  currency?: 'USD' | 'VES' | 'EUR'
  frequency?: 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ONE_TIME' | 'CUSTOM'
  paymentDay: number
  secondPaymentDay?: number
  startDate: string
  notes?: string
}

const includeRules = {
  payrollRules: {
    where: { status: { not: 'CANCELLED' as const } },
    orderBy: { createdAt: 'desc' as const },
  },
}

export const employeeService = {
  async findAll(workspaceId: string) {
    return prisma.employee.findMany({
      where:   { workspaceId, status: { not: 'INACTIVE' } },
      include: includeRules,
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: string, workspaceId: string) {
    return prisma.employee.findFirstOrThrow({
      where:   { id, workspaceId },
      include: includeRules,
    })
  },

  async create(data: CreateEmployeeInput) {
    return prisma.employee.create({ data, include: includeRules })
  },

  async update(id: string, workspaceId: string, data: UpdateEmployeeInput) {
    await prisma.employee.findFirstOrThrow({ where: { id, workspaceId } })
    return prisma.employee.update({ where: { id }, data, include: includeRules })
  },

  async addPayrollRule(employeeId: string, workspaceId: string, data: AddPayrollRuleInput) {
    const employee = await prisma.employee.findFirstOrThrow({ where: { id: employeeId, workspaceId } })

    // Cerrar regla activa anterior
    await prisma.payrollRule.updateMany({
      where:  { employeeId, workspaceId, status: 'ACTIVE' },
      data:   { status: 'PAUSED', endDate: new Date() },
    })

    return prisma.payrollRule.create({
      data: {
        employeeId,
        workspaceId: employee.workspaceId,
        amount:      data.amount,
        currency:    data.currency ?? 'USD',
        frequency:   data.frequency ?? 'MONTHLY',
        paymentDay:  data.paymentDay,
        secondPaymentDay: data.secondPaymentDay,
        startDate:   new Date(data.startDate),
        notes:       data.notes,
      },
    })
  },

  async findPayments(employeeId: string, workspaceId: string) {
    await prisma.employee.findFirstOrThrow({ where: { id: employeeId, workspaceId } })
    return prisma.payrollPayment.findMany({
      where:   { employeeId, workspaceId, cancelled: false },
      include: {
        account:          { select: { id: true, name: true } },
        payrollObligation: { select: { id: true, description: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })
  },
}
