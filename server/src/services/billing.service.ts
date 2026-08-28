import { prisma } from '../lib/prisma.js'

/**
 * Genera cuentas por cobrar mensuales para todos los ClientServices ACTIVE MONTHLY
 * del workspace especificado para un mes/año dado.
 * El @@unique([clientServiceId, periodMonth, periodYear]) garantiza no-duplicados.
 */
export const billingService = {
  async generateMonthlyReceivables(workspaceId: string, month: number, year: number) {
    const activeServices = await prisma.clientService.findMany({
      where: {
        status:           'ACTIVE',
        billingFrequency: 'MONTHLY',
        client:           { workspaceId },
      },
      include: {
        client:  { select: { id: true, name: true, workspaceId: true } },
        service: { select: { id: true, name: true } },
      },
    })

    const created: string[] = []
    const skipped: string[] = []

    for (const cs of activeServices) {
      // Verificar si ya existe receivable para este período
      const exists = await prisma.receivable.findUnique({
        where: {
          clientServiceId_periodMonth_periodYear: {
            clientServiceId: cs.id,
            periodMonth:     month,
            periodYear:      year,
          },
        },
      })

      if (exists) {
        skipped.push(`${cs.client.name} - ${cs.service.name}`)
        continue
      }

      const monthName = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                         'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month - 1]
      const dueDate   = new Date(year, month - 1, cs.billingDay)

      await prisma.receivable.create({
        data: {
          workspaceId:     cs.client.workspaceId,
          clientId:        cs.clientId,
          clientServiceId: cs.id,
          description:     `${cs.service.name} - ${monthName} ${year}`,
          amount:          cs.price,
          dueDate,
          periodMonth:     month,
          periodYear:      year,
        },
      })

      created.push(`${cs.client.name} - ${cs.service.name}`)
    }

    return { created, skipped, month, year }
  },
}
