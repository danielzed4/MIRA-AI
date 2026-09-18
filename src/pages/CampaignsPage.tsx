import { useEffect, useState } from 'react'
import { Plus, X, Megaphone, Trash2, Pencil } from 'lucide-react'
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../api/platform'
import { getServices } from '../api/services'
import type { Campaign, Service } from '../types'
import { cn, formatPersianDate } from '../lib/utils'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', pending: 'در انتظار', scheduled: 'زمان‌بندی شده',
  active: 'در حال اجرا', completed: 'تمام شده', stopped: 'متوقف شده',
}

const statusBadges: Record<string, string> = {
  draft: 'badge-neutral', pending: 'badge-warning', scheduled: 'badge-accent',
  active: 'badge-success', completed: 'badge-neutral', stopped: 'badge-error',
}

interface FormState {
  name: string
  service_id: string
  start_at: string
  end_at: string
  status: string
}

const emptyForm: FormState = { name: '', service_id: '', start_at: '', end_at: '', status: 'draft' }

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const load = async () => {
    setLoading(true)
    try {
      const [cmps, svcs] = await Promise.all([getCampaigns(), getServices()])
      setCampaigns(cmps)
      setServices(svcs)
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (c: Campaign) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      service_id: c.service_id ?? '',
      start_at: c.start_at ?? '',
      end_at: c.end_at ?? '',
      status: c.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        service_id: form.service_id || null,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      }
      if (editingId) {
        await updateCampaign(editingId, payload)
      } else {
        await createCampaign(payload)
      }
      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleStatusChange = async (c: Campaign, newStatus: string) => {
    try {
      await updateCampaign(c.id, { status: newStatus })
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleDelete = async (c: Campaign) => {
    if (!confirm(`حذف کمپین «${c.name}»؟`)) return
    try { await deleteCampaign(c.id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">کمپین‌ها</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت کمپین‌های بازاریابی</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} />افزودن کمپین</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 text-sm">{c.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="btn-ghost p-1 text-neutral-500 hover:bg-neutral-100"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(c)} className="btn-ghost p-1 text-error-500 hover:bg-error-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c, e.target.value)}
                  className={cn('text-xs rounded-full px-2 py-1 border-0 cursor-pointer', statusBadges[c.status] ?? 'badge-neutral')}
                >
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {c.service && <span className="text-xs text-neutral-400">{c.service.icon} {c.service.name}</span>}
              </div>
              <div className="mt-3 text-xs text-neutral-500 space-y-1">
                {c.start_at && <p>شروع: {formatPersianDate(c.start_at)}</p>}
                {c.end_at && <p>پایان: {formatPersianDate(c.end_at)}</p>}
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="col-span-full card p-12 text-center">
              <Megaphone size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">کمپینی ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">{editingId ? 'ویرایش کمپین' : 'افزودن کمپین جدید'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">نام کمپین</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">خدمت</label>
                <select className="input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                  <option value="">بدون خدمت</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">شروع</label>
                  <input type="date" className="input" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                </div>
                <div>
                  <label className="label">پایان</label>
                  <input type="date" className="input" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">وضعیت</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editingId ? 'ذخیره تغییرات' : 'ایجاد کمپین'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
