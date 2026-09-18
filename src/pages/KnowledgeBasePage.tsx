import { useEffect, useState } from 'react'
import { Plus, X, BookOpen, Pencil, Trash2 } from 'lucide-react'
import { getKnowledgeBases, getKnowledgeBaseItems, createKnowledgeBaseItem, updateKnowledgeBaseItem, deleteKnowledgeBaseItem } from '../api/platform'
import type { KnowledgeBase, KnowledgeBaseItem } from '../types'
import { cn } from '../lib/utils'

const itemTypeLabels: Record<string, string> = {
  faq: 'سؤال متداول', info: 'اطلاعات', rate: 'نرخ', property: 'ملک',
  vehicle: 'خودرو', room: 'اتاق', vacancy: 'موقعیت شغلی', rule: 'قانون', process: 'فرآیند',
}

export function KnowledgeBasePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [items, setItems] = useState<KnowledgeBaseItem[]>([])
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KnowledgeBaseItem | null>(null)
  const [form, setForm] = useState({ item_type: 'faq', question: '', answer: '', is_active: true })

  const load = async () => {
    setLoading(true)
    try {
      const data = await getKnowledgeBases()
      setKbs(data)
      if (data.length > 0 && !selectedKbId) setSelectedKbId(data[0].id)
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadItems = async (kbId: string) => {
    try {
      setItems(await getKnowledgeBaseItems(kbId))
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  useEffect(() => {
    if (selectedKbId) loadItems(selectedKbId)
    else setItems([])
  }, [selectedKbId])

  const openCreate = () => {
    setEditing(null)
    setForm({ item_type: 'faq', question: '', answer: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (item: KnowledgeBaseItem) => {
    setEditing(item)
    setForm({ item_type: item.item_type, question: item.question ?? '', answer: item.answer ?? '', is_active: item.is_active })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedKbId) return
    try {
      if (editing) await updateKnowledgeBaseItem(editing.id, form)
      else await createKnowledgeBaseItem({ ...form, knowledge_base_id: selectedKbId })
      setShowModal(false)
      await loadItems(selectedKbId)
    } catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleDelete = async (item: KnowledgeBaseItem) => {
    if (!confirm('حذف این مورد؟')) return
    try { await deleteKnowledgeBaseItem(item.id); if (selectedKbId) await loadItems(selectedKbId) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const selectedKb = kbs.find((k) => k.id === selectedKbId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">پایگاه دانش</h1>
          <p className="text-sm text-neutral-500 mt-1">دانش‌نامه اختصاصی هر خدمت</p>
        </div>
        {selectedKbId && <button onClick={openCreate} className="btn-primary"><Plus size={18} />افزودن مورد</button>}
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* KB list */}
        <div className="card p-3 lg:col-span-1">
          <p className="text-xs font-semibold text-neutral-400 uppercase mb-2 px-2">خدمات</p>
          <div className="space-y-1">
            {kbs.map((kb) => (
              <button
                key={kb.id}
                onClick={() => setSelectedKbId(kb.id)}
                className={cn('sidebar-item w-full text-right', selectedKbId === kb.id && 'sidebar-item-active')}
              >
                <span className="text-lg">{kb.service?.icon}</span>
                <span>{kb.service?.name ?? 'نامشخص'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
          ) : selectedKb ? (
            <>
              <div className="card p-4">
                <h2 className="font-semibold text-neutral-900">{selectedKb.service?.icon} {selectedKb.service?.name}</h2>
                {selectedKb.description && <p className="text-sm text-neutral-500 mt-1">{selectedKb.description}</p>}
              </div>
              {items.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-primary text-xs">{itemTypeLabels[item.item_type] ?? item.item_type}</span>
                        {!item.is_active && <span className="badge-neutral text-xs">غیرفعال</span>}
                      </div>
                      {item.question && <p className="font-medium text-sm text-neutral-900">{item.question}</p>}
                      {item.answer && <p className="text-sm text-neutral-600 mt-1">{item.answer}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(item)} className="btn-ghost p-1"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(item)} className="btn-ghost p-1 text-error-500 hover:bg-error-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="card p-12 text-center">
                  <BookOpen size={32} className="mx-auto text-neutral-300 mb-3" />
                  <p className="text-sm text-neutral-500">موردی در این دانش‌نامه ثبت نشده است</p>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 text-center">
              <BookOpen size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">یک خدمت را انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">{editing ? 'ویرایش مورد' : 'افزودن مورد دانش‌نامه'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">نوع مورد</label>
                <select className="input" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>
                  {Object.entries(itemTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">سؤال / عنوان</label>
                <input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              </div>
              <div>
                <label className="label">پاسخ / توضیحات</label>
                <textarea className="input" rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-neutral-300 text-primary-600" />
                <span className="text-sm text-neutral-700">فعال</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'ذخیره' : 'افزودن'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
