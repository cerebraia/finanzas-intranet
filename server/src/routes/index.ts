import { Router } from 'express'
import workspacesRouter       from './workspaces.routes.js'
import accountsRouter         from './accounts.routes.js'
import categoriesRouter       from './categories.routes.js'
import transactionsRouter     from './transactions.routes.js'
import dashboardRouter        from './dashboard.routes.js'
import clientsRouter          from './clients.routes.js'
import receivablesRouter      from './receivables.routes.js'
import businessRouter         from './business.routes.js'
import employeesRouter        from './employees.routes.js'
import payrollRouter          from './payroll.routes.js'
import recurringExpensesRouter from './recurringExpenses.routes.js'
import pendingItemsRouter     from './pendingItems.routes.js'
import debtsRouter            from './debts.routes.js'
import importRouter           from './import.routes.js'

const router = Router()
router.use('/workspaces',         workspacesRouter)
router.use('/accounts',           accountsRouter)
router.use('/categories',         categoriesRouter)
router.use('/transactions',       transactionsRouter)
router.use('/dashboard',          dashboardRouter)
router.use('/clients',            clientsRouter)
router.use('/receivables',        receivablesRouter)
router.use('/business',           businessRouter)
router.use('/employees',          employeesRouter)
router.use('/payroll',            payrollRouter)
router.use('/recurring-expenses', recurringExpensesRouter)
router.use('/pending-items',      pendingItemsRouter)
router.use('/debts',              debtsRouter)
router.use('/import',             importRouter)
export default router
