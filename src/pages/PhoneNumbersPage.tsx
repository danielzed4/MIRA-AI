import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Phone, Check, ChevronDown, ChevronLeft } from 'lucide-react'
import { getPhoneNumbers, createPhoneNumber, updatePhoneNumber, deletePhoneNumber, assignServiceToPhone, removeServiceFromPhone } from '../api/phoneNumbers'
import { getServices } from '../api/services'
import type { PhoneNumber, Service } from '../types'
import { cn } from '../lib/utils'

export function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [allServices, setAllServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<PhoneNumber | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ internal_name: '', phone_number: '', sim_label: '', description: '', status: 'active', is_primary: false })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [pns, svcs] = await Promise.all([getPhoneNumbers(), getServices()])
      setPhoneNumbers(pns)
      setAllServices(svcs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری شماره‌ها')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ internal_name: '', phone_number: '', sim_label: '', description: '', status: 'active', is_primary: false })
    setShowModal(true)
  }

  const openEdit = (pn: PhoneNumber) => {
    setEditing(pn)
    setForm({
      internal_name: pn.internal_name,
      phone_number: pn.phone_number ?? '',
      sim_label: pn.sim_label ?? '',
      description: pn.description ?? '',
      status: pn.status,
      is_primary: pn.is_primary,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = { ...form, phone_number: form.phone_number || null, sim_label: form.sim_label || null }
      if (editing) {
        await updatePhoneNumber(editing.id, data)
      } else {
        await createPhoneNumber(data)
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره شماره')
    }
  }

  const handleDelete = async (pn: PhoneNumber) => {
    if (!confirm(`آیا از حذف «${pn.internal_name}» مطمئن هستید؟`)) return
    try {
      await deletePhoneNumber(pn.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف شماره')
    }
  }

  const toggleService = async (pnId: string, service: Service, assigned: boolean) => {
    try {
      if (assigned) {
        await removeServiceFromPhone(pnId, service.id)
      } else {
        await assignServiceToPhone(pnId, service.id)
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تغییر خدمت')
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge-success">فعال</span>
      case 'inactive': return <span className="badge-neutral">غیرفعال</span>
      case 'error': return <span className="badge-error">خطا</span>
      default: return <span className="badge-neutral">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">شماره‌ها و حساب‌ها</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت سیم‌کارت‌ها و حساب‌های پیام‌رسان</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} />
          افزودن شماره
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
        <div className="space-y-4">
          {phoneNumbers.map((pn) => {
            const isExpanded = expandedId === pn.id
            const assignedServiceIds = new Set(pn.services?.map((s) => s.id) ?? [])
            return (
              <div key={pn.id} className="card overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-xl shrink-0',
                        pn.is_primary ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-500',
                      )}>
                        <Phone size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-neutral-900">{pn.internal_name}</h3>
                          {pn.sim_label && <span className="badge-primary">{pn.sim_label}</span>}
                          {pn.is_primary && <span className="badge-accent">اصلی</span>}
                          {statusBadge(pn.status)}
                        </div>
                        {pn.phone_number && <p className="text-sm text-neutral-500 mt-1" dir="ltr">{pn.phone_number}</p>}
                        {pn.description && <p className="text-sm text-neutral-400 mt-1">{pn.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {pn.services?.map((s) => (
                            <span key={s.id} className="badge-neutral">
                              {s.icon} {s.name}
                            </span>
                          ))}
                          {(!pn.services || pn.services.length === 0) && (
                            <span className="text-xs text-neutral-400">خدمتی اختصاص داده نشده</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(pn)} className="btn-ghost p-1.5" aria-label="ویرایش">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(pn)} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50" aria-label="حذف">
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : pn.id)}
                        className="btn-ghost p-1.5"
                        aria-label="مدیریت خدمات"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-200 p-5 bg-neutral-50">
                    <p className="text-sm font-medium text-neutral-700 mb-3">مدیریت خدمات اختصاص‌داده‌شده</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allServices.map((s) => {
                        const assigned = assignedServiceIds.has(s.id)
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleService(pn.id, s, assigned)}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-lg border-2 transition-colors text-sm',
                              assigned
                                ? 'border-primary-300 bg-primary-50 text-primary-700'
                                : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50',
                            )}
                          >
                            <span className="text-lg">{s.icon}</span>
                            <span className="flex-1 text-right">{s.name}</span>
                            {assigned && <Check size={16} className="text-primary-600" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {phoneNumbers.length === 0 && (
            <div className="card p-12 text-center">
              <Phone size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">هنوز شماره‌ای ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editing ? 'ویرایش شماره' : 'افزودن شماره جدید'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">نام داخلی</label>
                <input className="input" value={form.internal_name} onChange={(e) => setForm({ ...form, internal_name: e.target.value })} required placeholder="مثال: سیم‌کارت ۱ — خدمات مالی" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">شماره تلفن</label>
                  <input className="input" dir="ltr" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+374..." />
                </div>
                <div>
                  <label className="label">برچسب سیم‌کارت</label>
                  <input className="input" dir="ltr" value={form.sim_label} onChange={(e) => setForm({ ...form, sim_label: e.target.value })} placeholder="SIM 01" />
                </div>
              </div>
              <div>
                <label className="label">توضیحات</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">وضعیت</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                    <option value="error">خطا</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                    <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm({ ...form, is_primary: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600" />
                    <span className="text-sm text-neutral-700">شماره اصلی</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره تغییرات' : 'ایجاد شماره'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
