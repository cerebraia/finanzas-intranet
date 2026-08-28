// Script manual de generación de nómina — npm run payroll:generate
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

async function main() {
  const now   = new Date()
  const month = parseInt(process.argv[2] ?? String(now.getMonth() + 1), 10)
  const year  = parseInt(process.argv[3] ?? String(now.getFullYear()), 10)

  console.log(`\n💼 Generando nómina — ${MONTH_NAMES[month - 1]} ${year}\n`)

  const workspaces = await prisma.workspace.findMany({ where: { isActive: true } })

  for (const ws of workspaces) {
    const rules = await prisma.payrollRule.findMany({
      where: { workspaceId: ws.id, status: 'ACTIVE', frequency: 'MONTHLY' },
      include: { employee: { select: { id: true, name: true, workspaceId: true } } },
    })

    if (rules.length === 0) continue
    console.log(`📂 Workspace: ${ws.name}`)

    let created = 0, skipped = 0

    for (const rule of rules) {
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
        console.log(`   ⏭  ${rule.employee.name} — ya existe`)
        skipped++
        continue
      }

      const dueDate = new Date(year, month - 1, rule.paymentDay)
      await prisma.payrollObligation.create({
        data: {
          workspaceId:   rule.employee.workspaceId,
          employeeId:    rule.employeeId,
          payrollRuleId: rule.id,
          description:   `Nómina ${MONTH_NAMES[month - 1]} ${year} — ${rule.employee.name}`,
          amount:        rule.amount,
          dueDate,
          periodMonth:   month,
          periodYear:    year,
        },
      })

      console.log(`   ✅ ${rule.employee.name} — $${rule.amount} — vence ${dueDate.toLocaleDateString('es-ES')}`)
      created++
    }

    console.log(`   Total: ${created} creadas, ${skipped} omitidas\n`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
