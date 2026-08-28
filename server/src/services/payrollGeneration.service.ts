import { prisma } from '../lib/prisma.js'

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

/**
 * Genera obligaciones de nómina mensuales para todos los PayrollRules ACTIVE MONTHLY
 * del workspace especificado para un mes/año dado.
 * @@unique([payrollRuleId, periodMonth, periodYear]) garantiza no-duplicados.
 */
export const payrollGenerationService = {
  async generateMonthlyPayroll(workspaceId: string, month: number, year: number) {
    const activeRules = await prisma.payrollRule.findMany({
      where: {
        status:    'ACTIVE',
        frequency: 'MONTHLY',
        employee:  { workspaceId },
      },
      include: {
        employee: { select: { id: true, name: true, workspaceId: true } },
      },
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const rule of activeRules) {
      const exists = await prisma.payrollObligation.findUnique({
        where: {
          payrollRuleId_periodMonth_periodYear: {
            payrollRuleId: rule.id,
            periodMonth:   month,
            periodYear:    year,
          },
        },
      })

      if (exists) {
        skipped.push(rule.employee.name)
        continue
      }

      const monthName = MONTH_NAMES[month - 1]
      const dueDate   = new Date(year, month - 1, rule.paymentDay)

      await prisma.payrollObligation.create({
        data: {
          workspaceId:   rule.employee.workspaceId,
          employeeId:    rule.employeeId,
          payrollRuleId: rule.id,
          description:   `Nómina ${monthName} ${year} — ${rule.employee.name}`,
          amount:        rule.amount,
          dueDate,
          periodMonth:   month,
          periodYear:    year,
        },
      })

      created.push(rule.employee.name)
    }

    return { created, skipped, month, year }
  },
}
