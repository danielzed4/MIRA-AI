import { useEffect, useState } from 'react'
import { Plus, X, Target, Flame, Pencil, Trash2 } from 'lucide-react'
import { getLeads, createLead, updateLead, deleteLead, type LeadWithRelations } from '../api/leads'
import { getCustomers, type CustomerWithRelations } from '../api/customers'
import { getServices } from '../api/services'
import { getEmployees, type EmployeeWithRelations } from '../api/employees'
import { getPhoneNumbers } from '../api/phoneNumbers'
import type { Service, PhoneNumber } from '../types'
import { cn, formatPersianDate } from '../lib/utils'

const statusLabels: Record<string, string> = {
  new: 'جدید', contacted: 'تماس گرفته شد', negotiating: 'در حال مذاکره',
  follow_up: 'پیگیری', won: 'موفق', lost: 'ناموفق', closed: 'بسته شده',
}
const statusBadges: Record<string, string> = {
  new: 'badge-primary', contacted: 'badge-accent', negotiating: 'badge-warning',
  follow_up: 'badge-accent', won: 'badge-success', lost: 'badge-error', closed: 'badge-neutral',
}
const priorityLabels: Record<string, string> = { low: 'کم', normal: 'عادی', high: 'زیاد', urgent: 'فوری' }

interface FormState {
  customer_id: string; service_id: string; phone_number_id: string; assigned_employee_id: string;
  status: string; priority: string; is_hot: boolean; title: string; notes: string; next_follow_up: string;
}
const emptyForm: FormState = {
  customer_id: '', service_id: '', phone_number_id: '', assigned_employee_id: '',
  status: 'new', priority: 'normal', is_hot: false, title: '', notes: '', next_follow_up: '',
}

export function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithRelations[]>([])
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const filterObj = filter === 'hot' ? { hotOnly: true } : filter !== 'all' ? { status: filter } : undefined
      const [ld, custs, svcs, emps, pns] = await Promise.all([
        getLeads(filterObj), getCustomers(), getServices(), getEmployees(), getPhoneNumbers(),
      ])
      setLeads(ld); setCustomers(custs); setServices(svcs); setEmployees(emps); setPhoneNumbers(pns)
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا در بارگذاری سرنخ‌ها') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }

  const openEdit = (lead: LeadWithRelations) => {
    setEditingId(lead.id)
    setForm({
      customer_id: lead.customer_id, service_id: lead.service_id ?? '', phone_number_id: lead.phone_number_id ?? '',
      assigned_employee_id: lead.assigned_employee_id ?? '', status: lead.status, priority: lead.priority,
      is_hot: lead.is_hot, title: lead.title ?? '', notes: lead.notes ?? '', next_follow_up: lead.next_follow_up ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || undefined,
        service_id: form.service_id || null,
        phone_number_id: form.phone_number_id || null,
        assigned_employee_id: form.assigned_employee_id || null,
        title: form.title || null, notes: form.notes || null,
        next_follow_up: form.next_follow_up || null,
      }
      if (editingId) { await updateLead(editingId, payload) }
      else { await createLead(payload) }
      setShowModal(false); setForm(emptyForm); setEditingId(null); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleStatusChange = async (lead: LeadWithRelations, newStatus: string) => {
    try { await updateLead(lead.id, { status: newStatus }); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleDelete = async (lead: LeadWithRelations) => {
    if (!confirm('آیا از حذف این سرنخ مطمئن هستید؟')) return
    try { await deleteLead(lead.id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const filters = [
    { key: 'all', label: 'همه' }, { key: 'new', label: 'جدید' }, { key: 'hot', label: 'داغ' },
    { key: 'negotiating', label: 'مذاکره' }, { key: 'follow_up', label: 'پیگیری' },
    { key: 'won', label: 'موفق' }, { key: 'closed', label: 'بسته شده' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">سرنخ‌ها</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت سرنخ‌ها و قیف فروش</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} />افزودن سرنخ</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200')}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="table-header px-4 py-3">مشتری</th>
                  <th className="table-header px-4 py-3">خدمت</th>
                  <th className="table-header px-4 py-3">شماره</th>
                  <th className="table-header px-4 py-3">وضعیت</th>
                  <th className="table-header px-4 py-3">اولویت</th>
                  <th className="table-header px-4 py-3">مسئول</th>
                  <th className="table-header px-4 py-3">پیگیری</th>
                  <th className="table-header px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {lead.is_hot && <Flame size={14} className="text-error-500" />}
                        <span className="font-medium">{lead.customer?.first_name ?? ''} {lead.customer?.last_name ?? ''}</span>
                      </div>
                      {lead.customer?.phone && <span className="text-xs text-neutral-400" dir="ltr">{lead.customer.phone}</span>}
                    </td>
                    <td className="table-cell">{lead.service && <span>{lead.service.icon} {lead.service.name}</span>}</td>
                    <td className="table-cell">{lead.phone_number?.sim_label ?? '—'}</td>
                    <td className="table-cell">
                      <select value={lead.status} onChange={(e) => handleStatusChange(lead, e.target.value)}
                        className={cn('text-xs rounded-full px-2 py-1 border-0 cursor-pointer', statusBadges[lead.status] ?? 'badge-neutral')}>
                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="table-cell"><span className="badge-neutral">{priorityLabels[lead.priority] ?? lead.priority}</span></td>
                    <td className="table-cell">{lead.assigned_employee ? `${lead.assigned_employee.first_name} ${lead.assigned_employee.last_name}` : '—'}</td>
                    <td className="table-cell text-neutral-500 text-xs">{lead.next_follow_up ? formatPersianDate(lead.next_follow_up) : '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(lead)} className="btn-ghost p-1 text-neutral-500 hover:bg-neutral-100"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(lead)} className="btn-ghost p-1 text-error-500 hover:bg-error-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12">
                    <Target size={32} className="mx-auto text-neutral-300 mb-3" />
                    <p className="text-sm text-neutral-500">سرنخی یافت نشد</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">{editingId ? 'ویرایش سرنخ' : 'افزودن سرنخ جدید'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">مشتری</label>
                <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required disabled={!!editingId}>
                  <option value="">انتخاب مشتری...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name ?? ''} {c.last_name ?? ''} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">خدمت</label>
                  <select className="input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                    <option value="">بدون خدمت</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">شماره / سیم‌کارت</label>
                  <select className="input" value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}>
                    <option value="">بدون شماره</option>
                    {phoneNumbers.map((pn) => <option key={pn.id} value={pn.id}>{pn.sim_label ?? pn.internal_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">وضعیت</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">اولویت</label>
                  <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">مسئول</label>
                <select className="input" value={form.assigned_employee_id} onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}>
                  <option value="">بدون مسئول</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">عنوان</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: استعلام نرخ دلار" />
              </div>
              <div>
                <label className="label">یادداشت</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div>
                <label className="label">تاریخ پیگیری بعدی</label>
                <input type="date" className="input" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_hot} onChange={(e) => setForm({ ...form, is_hot: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600" />
                <span className="text-sm text-neutral-700">سرنخ داغ</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editingId ? 'ذخیره تغییرات' : 'ایجاد سرنخ'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
