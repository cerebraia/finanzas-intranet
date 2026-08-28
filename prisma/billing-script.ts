// Script para generar cobros mensuales
// Uso: npm run billing:generate [-- --workspace=fernando-ads --month=8 --year=2026]
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { billingService } from '../server/src/services/billing.service.js'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const now  = new Date()

  let workspaceSlug = args.find(a => a.startsWith('--workspace='))?.split('=')[1] ?? 'fernando-ads'
  let month  = parseInt(args.find(a => a.startsWith('--month='))?.split('=')[1] ?? String(now.getMonth() + 1), 10)
  let year   = parseInt(args.find(a => a.startsWith('--year='))?.split('=')[1]  ?? String(now.getFullYear()), 10)

  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } })
  if (!workspace) {
    console.error(`❌ Workspace "${workspaceSlug}" no encontrado`)
    process.exit(1)
  }

  console.log(`🔄 Generando cobros para ${workspace.name} — ${month}/${year}`)
  const result = await billingService.generateMonthlyReceivables(workspace.id, month, year)

  console.log(`✅ Creados (${result.created.length}):`)
  result.created.forEach(c => console.log(`   + ${c}`))

  if (result.skipped.length > 0) {
    console.log(`⏭️  Omitidos (${result.skipped.length}) — ya existían:`)
    result.skipped.forEach(s => console.log(`   - ${s}`))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
