import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react'
import { getServices, createService, updateService, deleteService } from '../api/services'
import type { Service } from '../types'
import { cn } from '../lib/utils'

const colorOptions = [
  { value: 'primary', label: 'آبی', class: 'bg-primary-100 text-primary-700' },
  { value: 'accent', label: 'فیروزه‌ای', class: 'bg-accent-100 text-accent-700' },
  { value: 'success', label: 'سبز', class: 'bg-success-100 text-success-700' },
  { value: 'warning', label: 'نارنجی', class: 'bg-warning-100 text-warning-700' },
  { value: 'error', label: 'قرمز', class: 'bg-error-100 text-error-700' },
  { value: 'neutral', label: 'خاکستری', class: 'bg-neutral-100 text-neutral-700' },
]

const colorClass = (color: string) =>
  colorOptions.find((c) => c.value === color)?.class ?? colorOptions[0].class

const iconOptions = ['💱', '🏠', '🏢', '🛏️', '💼', '🚗', '🛵', '📋', '🏨', '✈️', '📱', '🔧']

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '📋', description: '', color: 'primary' })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getServices()
      setServices(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری خدمات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', slug: '', icon: '📋', description: '', color: 'primary' })
    setShowModal(true)
  }

  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({ name: s.name, slug: s.slug, icon: s.icon, description: s.description ?? '', color: s.color })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const slug = form.slug || form.name.trim().toLowerCase().replace(/\s+/g, '_')
      if (editing) {
        await updateService(editing.id, { ...form, slug })
      } else {
        await createService({ ...form, slug, is_active: true, is_archived: false, sort_order: services.length + 1 })
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره خدمت')
    }
  }

  const handleDelete = async (s: Service) => {
    if (!confirm(`آیا از حذف خدمت «${s.name}» مطمئن هستید؟`)) return
    try {
      await deleteService(s.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف خدمت')
    }
  }

  const toggleActive = async (s: Service) => {
    try {
      await updateService(s.id, { is_active: !s.is_active })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تغییر وضعیت')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">خدمات شرکت</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت خدمات و محدوده کسب‌وکار</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} />
          افزودن خدمت
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl text-2xl', colorClass(s.color))}>
                  {s.icon}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(s)} className="btn-ghost p-1.5" aria-label="ویرایش">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(s)} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50" aria-label="حذف">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-neutral-900">{s.name}</h3>
              {s.description && <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{s.description}</p>}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => toggleActive(s)}
                  className={s.is_active ? 'badge-success' : 'badge-neutral'}
                >
                  {s.is_active ? 'فعال' : 'غیرفعال'}
                </button>
                {s.is_archived && <span className="badge-warning">بایگانی شده</span>}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="col-span-full card p-12 text-center">
              <Building2 size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">هنوز خدمتی ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editing ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">نام خدمت</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="مثال: صرافی" />
              </div>
              <div>
                <label className="label">شناسه (slug)</label>
                <input className="input" dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="exchange" />
                <p className="text-xs text-neutral-400 mt-1">اگر خالی باشد، خودکار ساخته می‌شود</p>
              </div>
              <div>
                <label className="label">آیکون</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-xl border-2 transition-colors',
                        form.icon === icon ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:bg-neutral-50',
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">رنگ</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors',
                        c.class,
                        form.color === c.value ? 'border-primary-500' : 'border-transparent',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">توضیحات</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره تغییرات' : 'ایجاد خدمت'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
