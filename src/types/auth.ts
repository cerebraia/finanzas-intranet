export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface User {
  id:          string
  firstName:   string
  lastName:    string
  email:       string
  avatar?:     string
  role:        UserRole
  workspaceId: string
  status:      UserStatus
  createdAt:   string
}

export type Permission =
  | 'view:dashboard'
  | 'view:finances'
  | 'view:clients'
  | 'view:team'
  | 'view:debts'
  | 'view:reports'
  | 'view:settings'
  | 'view:categories'
  | 'edit:transactions'
  | 'edit:clients'
  | 'edit:team'
  | 'edit:debts'
  | 'edit:settings'
  | 'delete:any'
  | 'admin:all'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ['admin:all', 'view:dashboard','view:finances','view:clients','view:team','view:debts','view:reports','view:settings','view:categories','edit:transactions','edit:clients','edit:team','edit:debts','edit:settings','delete:any'],
  ADMIN:       ['view:dashboard','view:finances','view:clients','view:team','view:debts','view:reports','view:settings','view:categories','edit:transactions','edit:clients','edit:team','edit:debts','edit:settings','delete:any'],
  MANAGER:     ['view:dashboard','view:finances','view:clients','view:reports','edit:transactions','edit:clients'],
  EMPLOYEE:    ['view:dashboard','view:finances'],
  VIEWER:      ['view:dashboard','view:reports'],
}

// Rutas accesibles por rol (usadas para filtrar el sidebar)
export const ROLE_NAV_GROUPS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN:       ['*'],
  MANAGER:     ['/', '/pending', '/calendario', '/movements', '/income', '/expenses', '/accounts', '/clients', '/receivables', '/business-reports', '/reports', '/statistics', '/budgets', '/fernando-ads', '/metas-anuales', '/por-comprar', '/recordatorios'],
  EMPLOYEE:    ['/', '/pending', '/calendario', '/income', '/expenses', '/movements', '/metas-anuales'],
  VIEWER:      ['/', '/calendario', '/statistics'],
}

// Mock users para desarrollo
export const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 'user-admin-1',
    firstName: 'Fernando',
    lastName: 'López',
    email: 'fernando@ads.com',
    role: 'ADMIN',
    workspaceId: 'fernando-ads',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    password: 'admin123',
  },
  {
    id: 'user-manager-1',
    firstName: 'Alejandra',
    lastName: 'García',
    email: 'manager@ads.com',
    role: 'MANAGER',
    workspaceId: 'fernando-ads',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    password: 'manager123',
  },
  {
    id: 'user-viewer-1',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'viewer@ads.com',
    role: 'VIEWER',
    workspaceId: 'personal',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    password: 'viewer123',
  },
]
