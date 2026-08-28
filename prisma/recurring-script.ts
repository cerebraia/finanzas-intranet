// Script manual de generación de gastos fijos — npm run recurring:generate
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

  console.log(`\n📋 Generando gastos fijos — ${MONTH_NAMES[month - 1]} ${year}\n`)

  const workspaces = await prisma.workspace.findMany({ where: { isActive: true } })

  for (const ws of workspaces) {
    const expenses = await prisma.recurringExpense.findMany({
      where: { workspaceId: ws.id, isActive: true, frequency: 'MONTHLY' },
    })

    if (expenses.length === 0) continue
    console.log(`📂 Workspace: ${ws.name}`)

    let created = 0, skipped = 0

    for (const exp of expenses) {
      const exists = await prisma.recurringExpenseObligation.findUnique({
        where: {
          recurringExpenseId_periodMonth_periodYear: {
            recurringExpenseId: exp.id,
            periodMonth:        month,
            periodYear:         year,
          },
        },
      })

      if (exists) {
        console.log(`   ⏭  ${exp.name} — ya existe`)
        skipped++
        continue
      }

      const dueDate = new Date(year, month - 1, exp.paymentDay)
      await prisma.recurringExpenseObligation.create({
        data: {
          workspaceId:        ws.id,
          recurringExpenseId: exp.id,
          amount:             exp.amount,
          dueDate,
          periodMonth:        month,
          periodYear:         year,
        },
      })

      console.log(`   ✅ ${exp.name} — $${exp.amount} — vence ${dueDate.toLocaleDateString('es-ES')}`)
      created++
    }

    console.log(`   Total: ${created} creadas, ${skipped} omitidas\n`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
