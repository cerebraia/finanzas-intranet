import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useCreateEmployee, useAddPayrollRule } from '@/hooks/useEmployees'
import { cn } from '@/lib/utils'

interface NewEmployeeModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

const inputCls = cn(
  'w-full px-3 py-2 rounded-lg border border-base-border bg-base-elevated',
  'text-sm text-content-primary placeholder:text-content-disabled',
  'focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600/60 transition-colors'
)
const labelCls = 'text-xs font-medium text-content-muted mb-1.5 block'

export function NewEmployeeModal({ open, onClose, workspaceId }: NewEmployeeModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null)

  // Step 1 — employee data
  const [name, setName]   = useState('')
  const [role, setRole]   = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Step 2 — payroll rule
  const [amount, setAmount]         = useState('')
  const [paymentDay, setPaymentDay] = useState('')
  const [startDate, setStartDate]   = useState(new Date().toISOString().slice(0, 7) + '-01')

  const createEmployee = useCreateEmployee()
  const addRule        = useAddPayrollRule()

  function reset() {
    setStep(1)
    setCreatedEmployeeId(null)
    setName(''); setRole(''); setEmail(''); setPhone(''); setNotes('')
    setAmount(''); setPaymentDay(''); setStartDate(new Date().toISOString().slice(0, 7) + '-01')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    const emp = await createEmployee.mutateAsync({
      workspaceId,
      name,
      role:  role  || undefined,
      email: email || undefined,
      phone: phone || undefined,
      notes: notes || undefined,
    })
    setCreatedEmployeeId(emp.id)
    setStep(2)
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    if (!createdEmployeeId) return
    await addRule.mutateAsync({
      employeeId: createdEmployeeId,
      workspaceId,
      data: {
        amount:     Number(amount),
        frequency:  'MONTHLY',
        paymentDay: Number(paymentDay),
        startDate,
      },
    })
    handleClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className={cn(
          'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[calc(100vw-2rem)] max-w-md',
          'bg-base-surface border border-base-border rounded-2xl shadow-glow animate-fade-in focus:outline-none'
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
            <div>
              <Dialog.Title className="text-sm font-semibold text-content-primary">
                {step === 1 ? 'Nuevo miembro del equipo' : 'Configuración de pago'}
              </Dialog.Title>
              <p className="text-[10px] text-content-disabled mt-0.5">Paso {step} de 2</p>
            </div>
            <Dialog.Close className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          {step === 1 ? (
            <form onSubmit={handleStep1} className="px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Leo Aguado" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Rol</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="Ej: Diseño, Marketing..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+58..." className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones..." className={cn(inputCls, 'resize-none')} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={createEmployee.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                  {createEmployee.isPending ? 'Creando...' : 'Continuar →'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Monto mensual (USD) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
                  <input required type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={cn(inputCls, 'pl-6')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Día de pago *</label>
                <input required type="number" min="1" max="31" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} placeholder="Ej: 15 o 30" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha de inicio *</label>
                <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 rounded-lg border border-base-border text-sm font-medium text-content-muted hover:text-content-primary hover:bg-base-hover transition-colors">
                  ← Atrás
                </button>
                <button type="submit" disabled={addRule.isPending} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
                  {addRule.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
