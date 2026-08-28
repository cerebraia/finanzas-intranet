// [SEED DATA - DEV ONLY] — No usar en producción
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Workspaces ────────────────────────────────────────────────────────────
  const personal = await prisma.workspace.upsert({
    where:  { slug: 'personal' },
    update: {},
    create: { name: 'Personal', slug: 'personal', type: 'PERSONAL', emoji: '👤' },
  })

  const ads = await prisma.workspace.upsert({
    where:  { slug: 'fernando-ads' },
    update: {},
    create: { name: 'Fernando ADS', slug: 'fernando-ads', type: 'BUSINESS', emoji: '📢' },
  })

  // ─── Admin user (DEV ONLY) ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where:  { email: 'fernando@ads.com' },
    update: {},
    create: {
      id:           'seed-user-admin',
      firstName:    'Fernando',
      lastName:     'López',
      email:        'fernando@ads.com',
      passwordHash: adminHash,
      status:       'ACTIVE',
    },
  })

  // WorkspaceMember — admin pertenece a ambos workspaces
  await prisma.workspaceMember.upsert({
    where:  { userId_workspaceId: { userId: adminUser.id, workspaceId: personal.id } },
    update: {},
    create: { userId: adminUser.id, workspaceId: personal.id, role: 'OWNER' },
  })
  await prisma.workspaceMember.upsert({
    where:  { userId_workspaceId: { userId: adminUser.id, workspaceId: ads.id } },
    update: {},
    create: { userId: adminUser.id, workspaceId: ads.id, role: 'OWNER' },
  })

  // Manager user (DEV ONLY)
  const managerHash = await bcrypt.hash('manager123', 12)
  const managerUser = await prisma.user.upsert({
    where:  { email: 'manager@ads.com' },
    update: {},
    create: {
      id:           'seed-user-manager',
      firstName:    'Alejandra',
      lastName:     'García',
      email:        'manager@ads.com',
      passwordHash: managerHash,
      status:       'ACTIVE',
    },
  })
  await prisma.workspaceMember.upsert({
    where:  { userId_workspaceId: { userId: managerUser.id, workspaceId: ads.id } },
    update: {},
    create: { userId: managerUser.id, workspaceId: ads.id, role: 'MANAGER' },
  })

  // ─── Categories (globales — workspaceId null) ──────────────────────────────
  const expenseCategories = [
    { name: 'Alimentación',       color: '#7C3AED', icon: '🛒' },
    { name: 'Transporte',         color: '#60A5FA', icon: '🚗' },
    { name: 'Vivienda',           color: '#34D399', icon: '🏠' },
    { name: 'Nómina / Equipo',    color: '#A78BFA', icon: '👥' },
    { name: 'Publicidad',         color: '#F87171', icon: '📢' },
    { name: 'Herramientas / SW',  color: '#FBBF24', icon: '🛠️' },
    { name: 'Suscripciones',      color: '#818CF8', icon: '📱' },
    { name: 'Salud',              color: '#6EE7B7', icon: '💊' },
    { name: 'Entretenimiento',    color: '#F472B6', icon: '🎮' },
    { name: 'Otros gastos',       color: '#94A3B8', icon: '📦' },
  ]

  const incomeCategories = [
    { name: 'Clientes',     color: '#34D399', icon: '👤' },
    { name: 'Servicios',    color: '#60A5FA', icon: '⚡' },
    { name: 'Consultoría',  color: '#7C3AED', icon: '💡' },
    { name: 'Ventas',       color: '#FBBF24', icon: '💰' },
    { name: 'Otros ingresos', color: '#94A3B8', icon: '➕' },
  ]

  const createdExpCats: Record<string, string> = {}
  const createdIncCats: Record<string, string> = {}

  for (const cat of expenseCategories) {
    const c = await prisma.category.upsert({
      where:  { id: `seed-exp-${cat.name}` },
      update: {},
      create: { id: `seed-exp-${cat.name}`, name: cat.name, type: 'EXPENSE', color: cat.color, icon: cat.icon },
    })
    createdExpCats[cat.name] = c.id
  }

  for (const cat of incomeCategories) {
    const c = await prisma.category.upsert({
      where:  { id: `seed-inc-${cat.name}` },
      update: {},
      create: { id: `seed-inc-${cat.name}`, name: cat.name, type: 'INCOME', color: cat.color, icon: cat.icon },
    })
    createdIncCats[cat.name] = c.id
  }

  // ─── Accounts (Personal) ──────────────────────────────────────────────────
  const pMercantil = await prisma.account.upsert({
    where: { id: 'seed-acc-mercantil' },
    update: {},
    create: { id: 'seed-acc-mercantil', workspaceId: personal.id, name: 'Mercantil', type: 'BANK',    currency: 'USD', initialBalance: 200 },
  })
  const pZelle = await prisma.account.upsert({
    where: { id: 'seed-acc-zelle' },
    update: {},
    create: { id: 'seed-acc-zelle',     workspaceId: personal.id, name: 'Zelle',     type: 'ZELLE',   currency: 'USD', initialBalance: 500 },
  })
  const pBinance = await prisma.account.upsert({
    where: { id: 'seed-acc-binance' },
    update: {},
    create: { id: 'seed-acc-binance',   workspaceId: personal.id, name: 'Binance',   type: 'CRYPTO',  currency: 'USD', initialBalance: 100 },
  })
  const pEfectivo = await prisma.account.upsert({
    where: { id: 'seed-acc-efectivo' },
    update: {},
    create: { id: 'seed-acc-efectivo',  workspaceId: personal.id, name: 'Efectivo',  type: 'CASH',    currency: 'USD', initialBalance: 50  },
  })
  const pBanesco = await prisma.account.upsert({
    where: { id: 'seed-acc-banesco' },
    update: {},
    create: { id: 'seed-acc-banesco',   workspaceId: personal.id, name: 'Banesco',   type: 'BANK',    currency: 'USD', initialBalance: 150 },
  })

  // ─── Accounts (Fernando ADS) ──────────────────────────────────────────────
  const aZelle = await prisma.account.upsert({
    where: { id: 'seed-acc-ads-zelle' },
    update: {},
    create: { id: 'seed-acc-ads-zelle', workspaceId: ads.id, name: 'Zelle ADS', type: 'ZELLE', currency: 'USD', initialBalance: 0 },
  })
  const aBanco = await prisma.account.upsert({
    where: { id: 'seed-acc-ads-banco' },
    update: {},
    create: { id: 'seed-acc-ads-banco', workspaceId: ads.id, name: 'Banco Negocios', type: 'BANK', currency: 'USD', initialBalance: 0 },
  })

  // ─── Transactions — Personal (últimos 3 meses) ────────────────────────────
  const now = new Date()
  const m = (offset: number) => new Date(now.getFullYear(), now.getMonth() - offset, 15).toISOString().slice(0, 10)

  const personalTxs = [
    // Ingresos
    { type: 'INCOME' as const, amount: 3200, description: '[SEED] Ingreso mes -2',    catId: createdIncCats['Servicios'],   accId: pZelle.id,    date: m(2), status: 'COMPLETED' as const },
    { type: 'INCOME' as const, amount: 3500, description: '[SEED] Ingreso mes -1',    catId: createdIncCats['Servicios'],   accId: pZelle.id,    date: m(1), status: 'COMPLETED' as const },
    { type: 'INCOME' as const, amount: 2500, description: '[SEED] Ingreso cliente A', catId: createdIncCats['Clientes'],    accId: pZelle.id,    date: m(0), status: 'COMPLETED' as const },
    { type: 'INCOME' as const, amount: 1700, description: '[SEED] Ingreso cliente B', catId: createdIncCats['Clientes'],    accId: pMercantil.id, date: m(0), status: 'COMPLETED' as const },
    // Gastos
    { type: 'EXPENSE' as const, amount: 120,  description: '[SEED] Supermercado',       catId: createdExpCats['Alimentación'],     accId: pZelle.id,    date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 45,   description: '[SEED] Gasolina',            catId: createdExpCats['Transporte'],      accId: pEfectivo.id, date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 400,  description: '[SEED] Nómina Leo',          catId: createdExpCats['Nómina / Equipo'], accId: pZelle.id,    date: m(0), status: 'PENDING' as const  },
    { type: 'EXPENSE' as const, amount: 130,  description: '[SEED] Nómina Bárbara',      catId: createdExpCats['Nómina / Equipo'], accId: pZelle.id,    date: m(0), status: 'PENDING' as const  },
    { type: 'EXPENSE' as const, amount: 29,   description: '[SEED] Notion',              catId: createdExpCats['Suscripciones'],   accId: pBinance.id,  date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 40,   description: '[SEED] Internet',            catId: createdExpCats['Vivienda'],        accId: pBanesco.id,  date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 90,   description: '[SEED] Medicamentos',        catId: createdExpCats['Salud'],           accId: pZelle.id,    date: m(1), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 200,  description: '[SEED] Alquiler aportación', catId: createdExpCats['Vivienda'],        accId: pMercantil.id, date: m(1), status: 'COMPLETED' as const },
  ]

  for (const tx of personalTxs) {
    await prisma.transaction.create({
      data: {
        workspaceId:     personal.id,
        accountId:       tx.accId,
        categoryId:      tx.catId,
        type:            tx.type,
        amount:          tx.amount,
        description:     tx.description,
        transactionDate: new Date(tx.date),
        status:          tx.status,
      },
    })
  }

  // ─── Transactions — Fernando ADS ─────────────────────────────────────────
  const adsTxs = [
    { type: 'INCOME' as const, amount: 250, description: '[SEED] Challenger 007',  catId: createdIncCats['Clientes'],  accId: aZelle.id, date: m(0), status: 'COMPLETED' as const },
    { type: 'INCOME' as const, amount: 250, description: '[SEED] Hang Ten',        catId: createdIncCats['Clientes'],  accId: aZelle.id, date: m(0), status: 'PENDING' as const   },
    { type: 'INCOME' as const, amount: 300, description: '[SEED] Toyo Éxito',      catId: createdIncCats['Clientes'],  accId: aZelle.id, date: m(0), status: 'PENDING' as const   },
    { type: 'INCOME' as const, amount: 3400, description: '[SEED] Facturación ADS', catId: createdIncCats['Clientes'], accId: aZelle.id, date: m(1), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 1620, description: '[SEED] Nómina equipo ADS', catId: createdExpCats['Nómina / Equipo'], accId: aBanco.id, date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 300, description: '[SEED] Herramientas ADS',   catId: createdExpCats['Herramientas / SW'], accId: aZelle.id, date: m(0), status: 'COMPLETED' as const },
    { type: 'EXPENSE' as const, amount: 200, description: '[SEED] Publicidad Meta',    catId: createdExpCats['Publicidad'],        accId: aZelle.id, date: m(0), status: 'COMPLETED' as const },
  ]

  for (const tx of adsTxs) {
    await prisma.transaction.create({
      data: {
        workspaceId:     ads.id,
        accountId:       tx.accId,
        categoryId:      tx.catId,
        type:            tx.type,
        amount:          tx.amount,
        description:     tx.description,
        transactionDate: new Date(tx.date),
        status:          tx.status,
      },
    })
  }

  // ─── Services (Fernando ADS) ──────────────────────────────────────────────
  const serviceNames = [
    'Gestión de Meta Ads',
    'Google Ads',
    'Consultoría',
    'Desarrollo Web',
    'Edición de Video',
    'Gestión de Marketing',
    'Automatización / IA',
    'Otros',
  ]
  const createdServices: Record<string, string> = {}
  for (const name of serviceNames) {
    const s = await prisma.service.upsert({
      where:  { id: `seed-svc-${name}` },
      update: {},
      create: { id: `seed-svc-${name}`, workspaceId: ads.id, name },
    })
    createdServices[name] = s.id
  }

  // ─── Clients (Fernando ADS) ───────────────────────────────────────────────
  const cToyo = await prisma.client.upsert({
    where:  { id: 'seed-client-toyo' },
    update: {},
    create: { id: 'seed-client-toyo', workspaceId: ads.id, name: 'Toyo Éxito', companyName: 'Toyo Éxito C.A.', status: 'ACTIVE' },
  })
  const cCalzado = await prisma.client.upsert({
    where:  { id: 'seed-client-calzado' },
    update: {},
    create: { id: 'seed-client-calzado', workspaceId: ads.id, name: 'Calzado Standar', status: 'ACTIVE' },
  })
  const cChallenger = await prisma.client.upsert({
    where:  { id: 'seed-client-challenger' },
    update: {},
    create: { id: 'seed-client-challenger', workspaceId: ads.id, name: 'Challenger 007', status: 'ACTIVE' },
  })

  // ─── ClientServices ───────────────────────────────────────────────────────
  const csToyo = await prisma.clientService.upsert({
    where:  { id: 'seed-cs-toyo' },
    update: {},
    create: {
      id: 'seed-cs-toyo', clientId: cToyo.id,
      serviceId: createdServices['Gestión de Meta Ads'],
      price: 300, billingFrequency: 'MONTHLY', billingDay: 15,
      startDate: new Date('2026-01-01'),
    },
  })
  const csCalzado = await prisma.clientService.upsert({
    where:  { id: 'seed-cs-calzado' },
    update: {},
    create: {
      id: 'seed-cs-calzado', clientId: cCalzado.id,
      serviceId: createdServices['Gestión de Meta Ads'],
      price: 350, billingFrequency: 'MONTHLY', billingDay: 30,
      startDate: new Date('2026-01-01'),
    },
  })
  const csChallenger = await prisma.clientService.upsert({
    where:  { id: 'seed-cs-challenger' },
    update: {},
    create: {
      id: 'seed-cs-challenger', clientId: cChallenger.id,
      serviceId: createdServices['Gestión de Meta Ads'],
      price: 250, billingFrequency: 'MONTHLY', billingDay: 10,
      startDate: new Date('2026-01-01'),
    },
  })

  // ─── Receivables del mes actual ───────────────────────────────────────────
  const now    = new Date()
  const mo     = now.getMonth() + 1
  const yr     = now.getFullYear()
  const prevMo = mo === 1 ? 12 : mo - 1
  const prevYr = mo === 1 ? yr - 1 : yr

  // Toyo: PAGADO mes actual
  const recToyo = await prisma.receivable.upsert({
    where:  { clientServiceId_periodMonth_periodYear: { clientServiceId: csToyo.id, periodMonth: mo, periodYear: yr } },
    update: {},
    create: {
      id: 'seed-rec-toyo-current',
      workspaceId: ads.id, clientId: cToyo.id, clientServiceId: csToyo.id,
      description: `Gestión de Meta Ads - ${mo}/${yr}`,
      amount: 300, amountPaid: 300, dueDate: new Date(yr, mo - 1, 15),
      status: 'PAID', periodMonth: mo, periodYear: yr,
    },
  })

  // Calzado: PENDIENTE mes actual
  await prisma.receivable.upsert({
    where:  { clientServiceId_periodMonth_periodYear: { clientServiceId: csCalzado.id, periodMonth: mo, periodYear: yr } },
    update: {},
    create: {
      id: 'seed-rec-calzado-current',
      workspaceId: ads.id, clientId: cCalzado.id, clientServiceId: csCalzado.id,
      description: `Gestión de Meta Ads - ${mo}/${yr}`,
      amount: 350, amountPaid: 0, dueDate: new Date(yr, mo - 1, 30),
      status: 'PENDING', periodMonth: mo, periodYear: yr,
    },
  })

  // Challenger: VENCIDO (mes anterior)
  await prisma.receivable.upsert({
    where:  { clientServiceId_periodMonth_periodYear: { clientServiceId: csChallenger.id, periodMonth: prevMo, periodYear: prevYr } },
    update: {},
    create: {
      id: 'seed-rec-challenger-overdue',
      workspaceId: ads.id, clientId: cChallenger.id, clientServiceId: csChallenger.id,
      description: `Gestión de Meta Ads - ${prevMo}/${prevYr}`,
      amount: 250, amountPaid: 0, dueDate: new Date(prevYr, prevMo - 1, 10),
      status: 'PENDING', periodMonth: prevMo, periodYear: prevYr,
    },
  })

  // ─── ClientPayment + Transaction para Toyo pagado ─────────────────────────
  const clientsCatId = createdIncCats['Clientes']
  const paymentTx = await prisma.transaction.create({
    data: {
      workspaceId: ads.id, accountId: aZelle.id, categoryId: clientsCatId,
      clientId: cToyo.id, type: 'INCOME', status: 'COMPLETED',
      amount: 300, description: `[SEED] Pago de Toyo Éxito - Gestión de Meta Ads`,
      transactionDate: new Date(yr, mo - 1, 15),
    },
  })
  await prisma.clientPayment.create({
    data: {
      id: 'seed-payment-toyo',
      workspaceId: ads.id, clientId: cToyo.id,
      receivableId: recToyo.id, accountId: aZelle.id,
      amount: 300, paymentDate: new Date(yr, mo - 1, 15),
      transactionId: paymentTx.id,
    },
  }).catch(() => null) // ignora si ya existe

  // ─── Empleados Fernando ADS [SEED/DEV] ───────────────────────────────────
  const employees = [
    { id: 'seed-emp-leo',      name: 'Leo Aguado',       role: 'Diseño',     amount: 400, paymentDay: 15 },
    { id: 'seed-emp-victor',   name: 'Victor Pereira',   role: null,         amount: 320, paymentDay: 30 },
    { id: 'seed-emp-mariale',  name: 'Mariale Pereira',  role: null,         amount: 270, paymentDay: 30 },
    { id: 'seed-emp-barbara',  name: 'Bárbara Flores',   role: null,         amount: 130, paymentDay: 15 },
    { id: 'seed-emp-fernanda', name: 'Fernanda Mollica', role: null,         amount: 500, paymentDay: 1  },
  ]

  for (const emp of employees) {
    await prisma.employee.upsert({
      where:  { id: emp.id },
      update: {},
      create: { id: emp.id, workspaceId: ads.id, name: emp.name, role: emp.role, status: 'ACTIVE' },
    })

    const ruleId = `seed-rule-${emp.id}`
    await prisma.payrollRule.upsert({
      where:  { id: ruleId },
      update: {},
      create: {
        id:         ruleId,
        employeeId: emp.id,
        workspaceId: ads.id,
        amount:     emp.amount,
        currency:   'USD',
        frequency:  'MONTHLY',
        paymentDay: emp.paymentDay,
        startDate:  new Date('2026-01-01'),
        status:     'ACTIVE',
      },
    })
  }

  console.log('✅ Seed completado')
  console.log(`   Workspaces: ${personal.name}, ${ads.name}`)
  console.log(`   Cuentas Personal: Mercantil, Zelle, Binance, Efectivo, Banesco`)
  console.log(`   Cuentas ADS: Zelle ADS, Banco Negocios`)
  console.log(`   Categorías: ${expenseCategories.length} gastos, ${incomeCategories.length} ingresos`)
  console.log(`   Transacciones Personal: ${personalTxs.length}`)
  console.log(`   Transacciones ADS: ${adsTxs.length}`)
  console.log(`   Servicios ADS: ${serviceNames.length}`)
  console.log(`   Clientes ADS: Toyo Éxito, Calzado Standar, Challenger 007`)
  console.log(`   Receivables: Toyo(PAID), Calzado(PENDING), Challenger(OVERDUE)`)
  console.log(`   Empleados ADS: ${employees.map(e => e.name).join(', ')}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
