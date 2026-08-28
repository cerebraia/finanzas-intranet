import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { AppProvider }       from '@/context/AppContext'
import { AuthProvider }      from '@/context/AuthContext'
import { MainLayout }        from '@/components/layout'
import { PrivateRoute }      from '@/components/auth/PrivateRoute'

// ── Auth pages (públicas) — carga inmediata ───────────────────────────────────
import { LoginPage }          from '@/pages/Login'
import { RegisterPage }       from '@/pages/Register'
import { ForgotPasswordPage } from '@/pages/ForgotPassword'

// ── Error pages — carga inmediata ─────────────────────────────────────────────
import { NotFoundPage }   from '@/pages/Errors/NotFound'
import { ForbiddenPage }  from '@/pages/Errors/Forbidden'

// ── Core pages — carga inmediata (usadas en cada sesión) ──────────────────────
import { DashboardPage }      from '@/pages/Dashboard'
import { ExpensesPage }       from '@/pages/Expenses'
import { IncomePage }         from '@/pages/Income'
import { MovementsPage }      from '@/pages/Movements'
import { PendingPage }        from '@/pages/Pending'
import { PurchasesPage }      from '@/pages/Purchases'
import { RemindersPage }      from '@/pages/Reminders'
import { AccountsPage }       from '@/pages/Accounts'
import { ProfilePage }        from '@/pages/Profile'

// ── Lazy pages — solo se cargan cuando se navega ──────────────────────────────
const FinancesPage        = lazy(() => import('@/pages/Finances').then(m => ({ default: m.FinancesPage })))
const ClientsPage         = lazy(() => import('@/pages/Clients').then(m => ({ default: m.ClientsPage })))
const ClientDetailPage    = lazy(() => import('@/pages/ClientDetail').then(m => ({ default: m.ClientDetailPage })))
const PayrollPage         = lazy(() => import('@/pages/Payroll').then(m => ({ default: m.PayrollPage })))
const EmployeeDetailPage  = lazy(() => import('@/pages/EmployeeDetail').then(m => ({ default: m.EmployeeDetailPage })))
const DebtDetailPage      = lazy(() => import('@/pages/DebtDetail').then(m => ({ default: m.DebtDetailPage })))
const CasheaPage          = lazy(() => import('@/pages/Cashea').then(m => ({ default: m.CasheaPage })))
const SANPage             = lazy(() => import('@/pages/SAN').then(m => ({ default: m.SANPage })))
const DebtsPage           = lazy(() => import('@/pages/Debts').then(m => ({ default: m.DebtsPage })))
const CalendarPage        = lazy(() => import('@/pages/Calendar').then(m => ({ default: m.CalendarPage })))
const ReportsPage         = lazy(() => import('@/pages/Reports').then(m => ({ default: m.ReportsPage })))
const FixedExpensesPage   = lazy(() => import('@/pages/FixedExpenses').then(m => ({ default: m.FixedExpensesPage })))
const CardsPage           = lazy(() => import('@/pages/Cards').then(m => ({ default: m.CardsPage })))
const FernandoADSPage     = lazy(() => import('@/pages/FernandoADS').then(m => ({ default: m.FernandoADSPage })))
const ReceivablesPage     = lazy(() => import('@/pages/Receivables').then(m => ({ default: m.ReceivablesPage })))
const BusinessReportsPage = lazy(() => import('@/pages/BusinessReports').then(m => ({ default: m.BusinessReportsPage })))
const StatisticsPage      = lazy(() => import('@/pages/Statistics').then(m => ({ default: m.StatisticsPage })))
const BudgetsPage         = lazy(() => import('@/pages/Budgets').then(m => ({ default: m.BudgetsPage })))
const CategoriesPage      = lazy(() => import('@/pages/Categories').then(m => ({ default: m.CategoriesPage })))
const SettingsPage        = lazy(() => import('@/pages/Settings').then(m => ({ default: m.SettingsPage })))
const NotificationsPage   = lazy(() => import('@/pages/Notifications').then(m => ({ default: m.NotificationsPage })))
const ImportPage          = lazy(() => import('@/pages/Import').then(m => ({ default: m.ImportPage })))
const AnnualGoalsPage     = lazy(() => import('@/pages/AnnualGoals').then(m => ({ default: m.AnnualGoalsPage })))
const ServicesPage        = lazy(() => import('@/pages/Services').then(m => ({ default: m.ServicesPage })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  )
}

function PrivateApp() {
  return (
    <WorkspaceProvider>
      <AppProvider>
        <MainLayout>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Dashboard */}
              <Route path="/"                   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

              {/* General */}
              <Route path="/pending"            element={<PrivateRoute><PendingPage /></PrivateRoute>} />
              <Route path="/calendar"           element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
              <Route path="/calendario"         element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
              <Route path="/notificaciones"     element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
              <Route path="/movements"          element={<PrivateRoute><MovementsPage /></PrivateRoute>} />

              {/* Dinero */}
              <Route path="/income"             element={<PrivateRoute requiredPath="/income"><IncomePage /></PrivateRoute>} />
              <Route path="/expenses"           element={<PrivateRoute requiredPath="/expenses"><ExpensesPage /></PrivateRoute>} />
              <Route path="/accounts"           element={<PrivateRoute requiredPath="/accounts"><AccountsPage /></PrivateRoute>} />

              {/* Compromisos */}
              <Route path="/fixed-expenses"     element={<PrivateRoute requiredPath="/fixed-expenses"><FixedExpensesPage /></PrivateRoute>} />
              <Route path="/payroll"            element={<PrivateRoute requiredPath="/payroll"><PayrollPage /></PrivateRoute>} />
              <Route path="/equipo/:id"         element={<PrivateRoute requiredPath="/payroll"><EmployeeDetailPage /></PrivateRoute>} />
              <Route path="/debts"              element={<PrivateRoute requiredPath="/debts"><DebtsPage /></PrivateRoute>} />
              <Route path="/deudas/:id"         element={<PrivateRoute requiredPath="/debts"><DebtDetailPage /></PrivateRoute>} />
              <Route path="/cashea"             element={<PrivateRoute requiredPath="/cashea"><CasheaPage /></PrivateRoute>} />
              <Route path="/san"                element={<PrivateRoute requiredPath="/san"><SANPage /></PrivateRoute>} />
              <Route path="/cards"              element={<PrivateRoute><CardsPage /></PrivateRoute>} />

              {/* Negocios */}
              <Route path="/fernando-ads"       element={<PrivateRoute requiredPath="/fernando-ads"><FernandoADSPage /></PrivateRoute>} />
              <Route path="/clients"            element={<PrivateRoute requiredPath="/clients"><ClientsPage /></PrivateRoute>} />
              <Route path="/clients/:id"        element={<PrivateRoute requiredPath="/clients"><ClientDetailPage /></PrivateRoute>} />
              <Route path="/servicios"          element={<PrivateRoute requiredPath="/servicios"><ServicesPage /></PrivateRoute>} />
              <Route path="/receivables"        element={<PrivateRoute requiredPath="/receivables"><ReceivablesPage /></PrivateRoute>} />
              <Route path="/business-reports"   element={<PrivateRoute requiredPath="/business-reports"><BusinessReportsPage /></PrivateRoute>} />

              {/* Análisis */}
              <Route path="/reports"            element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
              <Route path="/statistics"         element={<PrivateRoute><StatisticsPage /></PrivateRoute>} />
              <Route path="/budgets"            element={<PrivateRoute><BudgetsPage /></PrivateRoute>} />

              {/* Sistema */}
              <Route path="/categories"         element={<PrivateRoute requiredPath="/categories"><CategoriesPage /></PrivateRoute>} />
              <Route path="/settings"           element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
              <Route path="/perfil"             element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/import"             element={<PrivateRoute><ImportPage /></PrivateRoute>} />
              <Route path="/por-comprar"        element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
              <Route path="/recordatorios"      element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
              <Route path="/metas-anuales"      element={<PrivateRoute><AnnualGoalsPage /></PrivateRoute>} />

              {/* Legacy */}
              <Route path="/finances"           element={<PrivateRoute><FinancesPage /></PrivateRoute>} />

              {/* Fallback */}
              <Route path="*"                   element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </AppProvider>
    </WorkspaceProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/403"             element={<ForbiddenPage />} />
          <Route path="/404"             element={<NotFoundPage />} />

          {/* App privada */}
          <Route path="/*" element={<PrivateApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
