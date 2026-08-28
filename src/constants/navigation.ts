import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  Wallet,
  CreditCard,
  PiggyBank,
  BriefcaseBusiness,
  Users,
  FileText,
  BarChart3,
  LineChart,
  Target,
  Tag,
  Settings,
  Megaphone,
  BadgeDollarSign,
  ShoppingCart,
  Bell,
  ListChecks,
} from 'lucide-react'
import type { NavGroup } from '@/types'

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'General',
    items: [
      { label: 'Pendientes',  path: '/pending',     icon: Clock },
      { label: 'Movimientos', path: '/movements',   icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Dinero',
    items: [
      { label: 'Ingresos', path: '/income',    icon: TrendingUp },
      { label: 'Gastos',   path: '/expenses',  icon: TrendingDown },
      { label: 'Cuentas',  path: '/accounts',  icon: Wallet },
    ],
  },
  {
    title: 'Compromisos',
    items: [
      { label: 'Gastos Fijos',   path: '/fixed-expenses', icon: FileText },
      { label: 'Nómina/Equipo',  path: '/payroll',        icon: BriefcaseBusiness },
      { label: 'Deudas',         path: '/debts',          icon: Landmark },
      { label: 'Cashea',         path: '/cashea',         icon: CreditCard },
      { label: 'SAN',            path: '/san',            icon: PiggyBank },
      { label: 'Tarjetas',       path: '/cards',          icon: BadgeDollarSign },
    ],
  },
  {
    title: 'Negocios',
    items: [
      { label: 'Fernando ADS',       path: '/fernando-ads',     icon: Megaphone },
      { label: 'Clientes',           path: '/clients',          icon: Users },
      { label: 'Cuentas por Cobrar', path: '/receivables',      icon: Clock },
      { label: 'Reportes Negocio',   path: '/business-reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Planificación',
    items: [
      { label: 'Metas del Año',     path: '/metas-anuales', icon: ListChecks },
      { label: 'Por comprar',       path: '/por-comprar',   icon: ShoppingCart },
      { label: 'Recordatorios',     path: '/recordatorios', icon: Bell },
      { label: 'Calendario',        path: '/calendario',    icon: CalendarDays },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { label: 'Reportes',     path: '/reports',     icon: BarChart3 },
      { label: 'Estadísticas', path: '/statistics',  icon: LineChart },
      { label: 'Presupuestos', path: '/budgets',     icon: Target },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Categorías',    path: '/categories', icon: Tag },
      { label: 'Configuración', path: '/settings',   icon: Settings },
    ],
  },
]
