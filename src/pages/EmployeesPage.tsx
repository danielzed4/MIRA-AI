import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, UserCog, Check, ChevronDown, ChevronLeft } from 'lucide-react'
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  assignServiceToEmployee, removeServiceFromEmployee,
  assignRoleToEmployee, removeRoleFromEmployee,
  getTeams, getRoles,
  type EmployeeWithRelations,
} from '../api/employees'
import { getServices } from '../api/services'
import type { Service, Role } from '../types'
import { cn } from '../lib/utils'

const statusBadges: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  on_leave: 'badge-warning',
}

const statusLabels: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  on_leave: 'مرخصی',
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EmployeeWithRelations | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', language: 'fa',
    status: 'active', team_id: '', capacity: 10, notes: '',
  })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [emps, svcs, rls, tms] = await Promise.all([
        getEmployees(), getServices(), getRoles(), getTeams(),
      ])
      setEmployees(emps)
      setServices(svcs)
      setRoles(rls)
      setTeams(tms)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری کارکنان')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ first_name: '', last_name: '', phone: '', email: '', language: 'fa', status: 'active', team_id: '', capacity: 10, notes: '' })
    setShowModal(true)
  }

  const openEdit = (emp: EmployeeWithRelations) => {
    setEditing(emp)
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone ?? '',
      email: emp.email ?? '',
      language: emp.language,
      status: emp.status,
      team_id: emp.team_id ?? '',
      capacity: emp.capacity,
      notes: emp.notes ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        team_id: form.team_id || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      }
      if (editing) {
        await updateEmployee(editing.id, data)
      } else {
        await createEmployee(data)
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره کارمند')
    }
  }

  const handleDelete = async (emp: EmployeeWithRelations) => {
    if (!confirm(`آیا از حذف «${emp.first_name} ${emp.last_name}» مطمئن هستید؟`)) return
    try {
      await deleteEmployee(emp.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف کارمند')
    }
  }

  const toggleService = async (empId: string, service: Service, assigned: boolean) => {
    try {
      if (assigned) await removeServiceFromEmployee(empId, service.id)
      else await assignServiceToEmployee(empId, service.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تغییر خدمت')
    }
  }

  const toggleRole = async (empId: string, role: Role, assigned: boolean) => {
    try {
      if (assigned) await removeRoleFromEmployee(empId, role.id)
      else await assignRoleToEmployee(empId, role.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تغییر نقش')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">کارکنان</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت کارکنان، تیم‌ها، نقش‌ها و دسترسی‌ها</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} />
          افزودن کارمند
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => {
            const isExpanded = expandedId === emp.id
            const assignedServiceIds = new Set(emp.services?.map((s) => s.id) ?? [])
            const assignedRoleIds = new Set(emp.roles?.map((r) => r.id) ?? [])
            return (
              <div key={emp.id} className="card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-100 text-primary-600 font-bold shrink-0">
                        {emp.first_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-neutral-900">{emp.first_name} {emp.last_name}</h3>
                          <span className={cn(statusBadges[emp.status] ?? 'badge-neutral')}>
                            {statusLabels[emp.status] ?? emp.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                          {emp.phone && <span dir="ltr">{emp.phone}</span>}
                          {emp.email && <span dir="ltr">{emp.email}</span>}
                          {emp.team && <span>تیم: {emp.team.name}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {emp.roles?.map((r) => (
                            <span key={r.id} className="badge-primary">{r.name}</span>
                          ))}
                          {emp.services?.map((s) => (
                            <span key={s.id} className="badge-neutral">{s.icon} {s.name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(emp)} className="btn-ghost p-1.5" aria-label="ویرایش">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(emp)} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50" aria-label="حذف">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : emp.id)} className="btn-ghost p-1.5" aria-label="مدیریت دسترسی">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-200 p-4 bg-neutral-50 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">خدمات</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {services.map((s) => {
                          const assigned = assignedServiceIds.has(s.id)
                          return (
                            <button key={s.id} onClick={() => toggleService(emp.id, s, assigned)}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg border-2 transition-colors text-sm',
                                assigned ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50',
                              )}>
                              <span className="text-lg">{s.icon}</span>
                              <span className="flex-1 text-right">{s.name}</span>
                              {assigned && <Check size={14} className="text-primary-600" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">نقش‌ها</p>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => {
                          const assigned = assignedRoleIds.has(r.id)
                          return (
                            <button key={r.id} onClick={() => toggleRole(emp.id, r, assigned)}
                              className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-colors text-sm',
                                assigned ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50',
                              )}>
                              <span>{r.name}</span>
                              {assigned && <Check size={14} className="text-primary-600" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {employees.length === 0 && (
            <div className="card p-12 text-center">
              <UserCog size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">هنوز کارمندی ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editing ? 'ویرایش کارمند' : 'افزودن کارمند جدید'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">نام</label>
                  <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                </div>
                <div>
                  <label className="label">نام خانوادگی</label>
                  <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">شماره تلفن</label>
                  <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+374..." />
                </div>
                <div>
                  <label className="label">ایمیل</label>
                  <input className="input" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">تیم</label>
                  <select className="input" value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}>
                    <option value="">بدون تیم</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">وضعیت</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                    <option value="on_leave">مرخصی</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">زبان</label>
                  <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                    <option value="hy">Հայերեն</option>
                  </select>
                </div>
                <div>
                  <label className="label">ظرفیت کاری</label>
                  <input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 10 })} min={1} />
                </div>
              </div>
              <div>
                <label className="label">یادداشت</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره تغییرات' : 'ایجاد کارمند'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
