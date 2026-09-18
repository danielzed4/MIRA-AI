import { useEffect, useState } from 'react'
import { Plus, Search, X, Users, Pencil, Trash2, Tag as TagIcon, MessageSquare, Phone, Mail, Send } from 'lucide-react'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getTags, assignTagToCustomer, removeTagFromCustomer, addCustomerNote, deleteCustomerNote, type CustomerWithRelations } from '../api/customers'
import type { Tag } from '../types'
import { cn, formatPersianDateTime, timeAgoPersian } from '../lib/utils'

const statusBadges: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  blocked: 'badge-error',
}

const statusLabels: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  blocked: 'مسدود',
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CustomerWithRelations | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', telegram_username: '', whatsapp_number: '', language: 'fa', country: '', city: '', status: 'active' })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [custs, tgs] = await Promise.all([getCustomers(search), getTags()])
      setCustomers(custs)
      setTags(tgs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری مشتریان')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => {
    setEditing(null)
    setForm({ first_name: '', last_name: '', phone: '', email: '', telegram_username: '', whatsapp_number: '', language: 'fa', country: '', city: '', status: 'active' })
    setShowModal(true)
  }

  const openEdit = (c: CustomerWithRelations) => {
    setEditing(c)
    setForm({
      first_name: c.first_name ?? '', last_name: c.last_name ?? '',
      phone: c.phone ?? '', email: c.email ?? '',
      telegram_username: c.telegram_username ?? '', whatsapp_number: c.whatsapp_number ?? '',
      language: c.language, country: c.country ?? '', city: c.city ?? '',
      status: c.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...form,
        phone: form.phone || null,
        email: form.email || null,
        telegram_username: form.telegram_username || null,
        whatsapp_number: form.whatsapp_number || null,
        country: form.country || null,
        city: form.city || null,
      }
      if (editing) {
        await updateCustomer(editing.id, data)
      } else {
        await createCustomer({ ...data, first_contact_at: new Date().toISOString() })
      }
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره مشتری')
    }
  }

  const handleDelete = async (c: CustomerWithRelations) => {
    if (!confirm(`آیا از حذف مشتری «${c.first_name ?? ''} ${c.last_name ?? ''}» مطمئن هستید؟`)) return
    try {
      await deleteCustomer(c.id)
      if (selectedId === c.id) setSelectedId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف مشتری')
    }
  }

  const selected = customers.find((c) => c.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">مشتریان</h1>
          <p className="text-sm text-neutral-500 mt-1">مدیریت مرکزی مشتریان</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} />
          افزودن مشتری
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="جستجوی نام، تلفن، ایمیل..."
              className="input pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'card p-3 w-full text-right hover:shadow-card-hover transition-all',
                    selectedId === c.id && 'ring-2 ring-primary-400',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600 font-bold shrink-0">
                      {(c.first_name ?? '؟').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {c.first_name ?? ''} {c.last_name ?? ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        {c.phone && <span dir="ltr">{c.phone}</span>}
                        <span className={cn(statusBadges[c.status] ?? 'badge-neutral')}>
                          {statusLabels[c.status] ?? c.status}
                        </span>
                      </div>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t.id} className="badge-neutral text-xs">{t.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {customers.length === 0 && (
                <div className="card p-8 text-center">
                  <Users size={24} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm text-neutral-500">مشتری‌ای یافت نشد</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <CustomerDetail
              customer={selected}
              tags={tags}
              onEdit={() => openEdit(selected)}
              onDelete={() => handleDelete(selected)}
              onTagToggle={async (tagId, assigned) => {
                try {
                  if (assigned) await removeTagFromCustomer(selected.id, tagId)
                  else await assignTagToCustomer(selected.id, tagId)
                  await load()
                } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
              }}
              onAddNote={async (content) => {
                try {
                  await addCustomerNote(selected.id, content)
                  await load()
                } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
              }}
              onDeleteNote={async (noteId) => {
                try {
                  await deleteCustomerNote(noteId)
                  await load()
                } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
              }}
            />
          ) : (
            <div className="card p-12 text-center">
              <Users size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">یک مشتری را انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                {editing ? 'ویرایش مشتری' : 'افزودن مشتری جدید'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">نام</label>
                  <input className="input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">نام خانوادگی</label>
                  <input className="input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
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
                  <label className="label">تلگرام</label>
                  <input className="input" dir="ltr" value={form.telegram_username} onChange={(e) => setForm({ ...form, telegram_username: e.target.value })} placeholder="@username" />
                </div>
                <div>
                  <label className="label">واتساپ</label>
                  <input className="input" dir="ltr" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+374..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                  <label className="label">کشور</label>
                  <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <label className="label">شهر</label>
                  <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">وضعیت</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="blocked">مسدود</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره تغییرات' : 'ایجاد مشتری'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerDetail({
  customer, tags, onEdit, onDelete, onTagToggle, onAddNote, onDeleteNote,
}: {
  customer: CustomerWithRelations
  tags: Tag[]
  onEdit: () => void
  onDelete: () => void
  onTagToggle: (tagId: string, assigned: boolean) => void
  onAddNote: (content: string) => void
  onDeleteNote: (noteId: string) => void
}) {
  const [noteText, setNoteText] = useState('')
  const assignedTagIds = new Set(customer.tags?.map((t) => t.id) ?? [])

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary-100 text-primary-600 text-xl font-bold">
              {(customer.first_name ?? '؟').charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {customer.first_name ?? ''} {customer.last_name ?? ''}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(statusBadges[customer.status] ?? 'badge-neutral')}>
                  {statusLabels[customer.status] ?? customer.status}
                </span>
                {customer.assigned_employee && (
                  <span className="text-xs text-neutral-500">
                    مسئول: {customer.assigned_employee.first_name} {customer.assigned_employee.last_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="btn-ghost p-1.5"><Pencil size={16} /></button>
            <button onClick={onDelete} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50"><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2 text-neutral-600"><Phone size={14} /><span dir="ltr">{customer.phone}</span></div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-neutral-600"><Mail size={14} /><span dir="ltr">{customer.email}</span></div>
          )}
          {customer.telegram_username && (
            <div className="flex items-center gap-2 text-neutral-600"><Send size={14} /><span dir="ltr">@{customer.telegram_username}</span></div>
          )}
          {customer.whatsapp_number && (
            <div className="flex items-center gap-2 text-neutral-600"><MessageSquare size={14} /><span dir="ltr">{customer.whatsapp_number}</span></div>
          )}
          {customer.city && <div className="text-neutral-600">{customer.city}{customer.country ? `, ${customer.country}` : ''}</div>}
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">اولین ارتباط: {customer.first_contact_at ? timeAgoPersian(customer.first_contact_at) : '—'}</p>
          <p className="text-xs text-neutral-400">آخرین ارتباط: {customer.last_contact_at ? timeAgoPersian(customer.last_contact_at) : '—'}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TagIcon size={16} className="text-neutral-500" />
          <h3 className="text-sm font-semibold text-neutral-900">برچسب‌ها</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const assigned = assignedTagIds.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => onTagToggle(t.id, assigned)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border-2 transition-colors',
                  assigned ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50',
                )}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Leads */}
      {customer.leads && customer.leads.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">سرنخ‌ها</h3>
          <div className="space-y-2">
            {customer.leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2">
                  {lead.service && <span className="text-lg">{lead.service.icon}</span>}
                  <span className="text-sm font-medium text-neutral-900">{lead.service?.name ?? 'بدون خدمت'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {lead.is_hot && <span className="badge-error">داغ</span>}
                  <span className="badge-neutral">{lead.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-neutral-900 mb-3">یادداشت‌های داخلی</h3>
        <div className="space-y-2 mb-3">
          {customer.notes?.map((note) => (
            <div key={note.id} className="flex items-start justify-between p-3 rounded-lg bg-neutral-50">
              <div className="flex-1">
                <p className="text-sm text-neutral-700">{note.content}</p>
                <p className="text-xs text-neutral-400 mt-1">{formatPersianDateTime(note.created_at)}</p>
              </div>
              <button onClick={() => onDeleteNote(note.id)} className="btn-ghost p-1 text-error-500 hover:bg-error-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {(!customer.notes || customer.notes.length === 0) && (
            <p className="text-sm text-neutral-400 text-center py-4">یادداشتی ثبت نشده است</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="یادداشت جدید..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && noteText.trim()) {
                onAddNote(noteText.trim())
                setNoteText('')
              }
            }}
          />
          <button
            onClick={() => {
              if (noteText.trim()) {
                onAddNote(noteText.trim())
                setNoteText('')
              }
            }}
            className="btn-primary"
          >
            افزودن
          </button>
        </div>
      </div>
    </div>
  )
}
