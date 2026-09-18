import { useEffect, useState } from 'react'
import { Plus, X, FileText, Pencil, Trash2, Send, Check } from 'lucide-react'
import { getContent, createContent, updateContent, deleteContent } from '../api/platform'
import { getServices } from '../api/services'
import type { Content, Service } from '../types'
import { cn, formatPersianDateTime } from '../lib/utils'

const contentTypeLabels: Record<string, string> = {
  text: 'متن', image: 'تصویر', banner: 'بنر', video: 'ویدیو',
  pdf: 'PDF', file: 'فایل', link: 'لینک', announcement: 'اطلاعیه',
  ad: 'تبلیغ', special_offer: 'پیشنهاد ویژه', event: 'رویداد', custom: 'سفارشی',
}

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', pending: 'در انتظار تأیید', approved: 'تأیید شده',
  scheduled: 'زمان‌بندی شده', published: 'منتشر شده', archived: 'بایگانی',
}

const statusBadges: Record<string, string> = {
  draft: 'badge-neutral', pending: 'badge-warning', approved: 'badge-primary',
  scheduled: 'badge-accent', published: 'badge-success', archived: 'badge-neutral',
}

export function ContentPage() {
  const [items, setItems] = useState<Content[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Content | null>(null)
  const [form, setForm] = useState({ title: '', body: '', content_type: 'text', service_id: '', language: 'fa', status: 'draft' })

  const load = async () => {
    setLoading(true)
    try {
      const [cont, svcs] = await Promise.all([getContent(), getServices()])
      setItems(cont)
      setServices(svcs)
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', body: '', content_type: 'text', service_id: '', language: 'fa', status: 'draft' })
    setShowModal(true)
  }

  const openEdit = (c: Content) => {
    setEditing(c)
    setForm({ title: c.title, body: c.body ?? '', content_type: c.content_type, service_id: c.service_id ?? '', language: c.language, status: c.status })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = { ...form, service_id: form.service_id || null }
      if (editing) await updateContent(editing.id, data)
      else await createContent(data)
      setShowModal(false)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleStatusChange = async (item: Content, status: string) => {
    try {
      await updateContent(item.id, { status, published_at: status === 'published' ? new Date().toISOString() : undefined })
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleDelete = async (item: Content) => {
    if (!confirm(`حذف «${item.title}»؟`)) return
    try { await deleteContent(item.id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">مدیریت محتوا</h1>
          <p className="text-sm text-neutral-500 mt-1">ایجاد، مدیریت و انتشار محتوا</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={18} />افزودن محتوا</button>
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900 text-sm">{item.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="btn-ghost p-1"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(item)} className="btn-ghost p-1 text-error-500 hover:bg-error-50"><Trash2 size={14} /></button>
                </div>
              </div>
              {item.body && <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{item.body}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neutral">{contentTypeLabels[item.content_type] ?? item.content_type}</span>
                <span className={cn(statusBadges[item.status] ?? 'badge-neutral')}>{statusLabels[item.status] ?? item.status}</span>
                {item.service && <span className="text-xs text-neutral-400">{item.service.icon} {item.service.name}</span>}
              </div>
              {item.status === 'draft' && (
                <button onClick={() => handleStatusChange(item, 'pending')} className="btn-secondary w-full mt-3 text-xs">
                  <Send size={12} /> ارسال برای تأیید
                </button>
              )}
              {item.status === 'pending' && (
                <button onClick={() => handleStatusChange(item, 'approved')} className="btn-primary w-full mt-3 text-xs">
                  <Check size={12} /> تأیید محتوا
                </button>
              )}
              {item.status === 'approved' && (
                <button onClick={() => handleStatusChange(item, 'published')} className="btn-primary w-full mt-3 text-xs">
                  <Send size={12} /> انتشار
                </button>
              )}
              <p className="text-xs text-neutral-400 mt-2">{formatPersianDateTime(item.created_at)}</p>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full card p-12 text-center">
              <FileText size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">محتوایی ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">{editing ? 'ویرایش محتوا' : 'افزودن محتوای جدید'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">عنوان</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="label">متن</label>
                <textarea className="input" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">نوع محتوا</label>
                  <select className="input" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}>
                    {Object.entries(contentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">خدمت</label>
                  <select className="input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
                    <option value="">بدون خدمت</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
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
                  </select>
                </div>
                <div>
                  <label className="label">وضعیت</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره' : 'ایجاد'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
