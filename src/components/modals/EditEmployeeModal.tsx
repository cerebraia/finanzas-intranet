import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateEmployee, useUpdatePayrollRule } from '@/hooks/useEmployees'
import type { ApiEmployee } from '@/types/api'

interface EditEmployeeModalProps {
  open:        boolean
  onClose:     () => void
  employee:    ApiEmployee | null
  workspaceId: string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function EditEmployeeModal({ open, onClose, employee, workspaceId }: EditEmployeeModalProps) {
  // Employee fields
  const [name,  setName]  = useState('')
  const [role,  setRole]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Payroll rule fields
  const [amount,     setAmount]     = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [startDate,  setStartDate]  = useState('')

  const updateEmployee    = useUpdateEmployee()
  const updatePayrollRule = useUpdatePayrollRule()

  const activeRule = employee?.payrollRules.find(r => r.status === 'ACTIVE') ?? null

  useEffect(() => {
    if (employee && open) {
      setName(employee.name)
      setRole(employee.role ?? '')
      setEmail(employee.email ?? '')
      setPhone(employee.phone ?? '')
      setNotes(employee.notes ?? '')

      if (activeRule) {
        setAmount(activeRule.amount)
        setPaymentDay(String(activeRule.paymentDay))
        setStartDate(activeRule.startDate)
      } else {
        setAmount('')
        setPaymentDay('')
        setStartDate('')
      }
    }
  }, [employee, open, activeRule])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employee) return

    const empData: Record<string, string | undefined> = {}
    if (name  !== employee.name)        empData.name  = name
    if (role  !== (employee.role ?? ''))  empData.role  = role || undefined
    if (email !== (employee.email ?? '')) empData.email = email || undefined
    if (phone !== (employee.phone ?? '')) empData.phone = phone || undefined
    if (notes !== (employee.notes ?? '')) empData.notes = notes || undefined

    const promises: Promise<unknown>[] = []

    if (Object.keys(empData).length > 0) {
      promises.push(
        updateEmployee.mutateAsync({ id: employee.id, workspaceId, data: empData })
      )
    }

    if (activeRule) {
      const ruleData: { amount?: number; paymentDay?: number; startDate?: string } = {}
      if (amount     !== activeRule.amount)            ruleData.amount     = Number(amount)
      if (paymentDay !== String(activeRule.paymentDay)) ruleData.paymentDay = Number(paymentDay)
      if (startDate  !== activeRule.startDate)          ruleData.startDate  = startDate

      if (Object.keys(ruleData).length > 0) {
        promises.push(
          updatePayrollRule.mutateAsync({ ruleId: activeRule.id, workspaceId, data: ruleData })
        )
      }
    }

    await Promise.all(promises)
    onClose()
  }

  if (!employee) return null

  const isPending = updateEmployee.isPending || updatePayrollRule.isPending

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border sticky top-0 bg-base-surface z-10">
            <div>
              <Dialog.Title className="text-sm font-semibold text-content-primary">Editar miembro</Dialog.Title>
              <p className="text-xs text-content-muted mt-0.5">{employee.name}</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Employee fields */}
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del miembro"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Rol</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Ej: Diseño, Marketing..."
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+58..."
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones..."
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            {/* Payroll rule section */}
            {activeRule && (
              <>
                <div className="border-t border-base-border pt-4">
                  <p className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-3">Condiciones de pago</p>
                </div>
                <div>
                  <label className={labelCls}>Monto mensual (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={cn(inputCls, 'pl-6')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Día de pago</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDay}
                      onChange={e => setPaymentDay(e.target.value)}
                      placeholder="Ej: 15"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fecha de inicio</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-content-disabled">
                  Los cambios de monto y día de pago aplicarán a las próximas obligaciones generadas.
                </p>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
