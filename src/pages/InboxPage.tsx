import { useEffect, useState, useRef } from 'react'
import {
  Search, Send, Flame, User, StickyNote, X,
  CheckCircle2, Clock, AlertCircle, Inbox as InboxIcon, Users as UsersIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  getConversations, getMessages, sendMessage, markConversationRead,
  assignConversation, updateConversationStatus, getInternalNotes, addInternalNote,
  type ConversationWithRelations,
} from '../api/conversations'
import { getEmployees, type EmployeeWithRelations } from '../api/employees'
import type { Message, InternalNote } from '../types'
import { cn, formatPersianTime, timeAgoPersian, formatPersianDateTime } from '../lib/utils'

const channelLabels: Record<string, string> = {
  telegram: 'تلگرام',
  whatsapp: 'واتساپ',
  internal: 'داخلی',
  sms: 'پیامک',
}

const statusLabels: Record<string, string> = {
  open: 'باز',
  pending: 'در انتظار',
  resolved: 'حل شده',
  archived: 'بایگانی',
}

const filterTabs = [
  { key: 'all', label: 'همه' },
  { key: 'unread', label: 'خوانده نشده' },
  { key: 'urgent', label: 'فوری' },
  { key: 'hot', label: 'سرنخ داغ' },
  { key: 'telegram', label: 'تلگرام' },
  { key: 'whatsapp', label: 'واتساپ' },
]

export function InboxPage() {
  const [conversations, setConversations] = useState<ConversationWithRelations[]>([])
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = async () => {
    setLoading(true)
    setError(null)
    try {
      const filterObj: Record<string, unknown> = {}
      if (filter === 'unread') filterObj.unreadOnly = true
      else if (filter === 'hot') filterObj.hotOnly = true
      else if (filter === 'urgent') filterObj.status = 'pending'
      else if (filter === 'telegram' || filter === 'whatsapp') filterObj.channel = filter
      if (debouncedSearch) filterObj.search = debouncedSearch

      const [convs, emps] = await Promise.all([
        getConversations(filterObj as Parameters<typeof getConversations>[0]),
        getEmployees(),
      ])
      setConversations(convs)
      setEmployees(emps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری مکالمات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { loadConversations() }, [filter, debouncedSearch])

  useEffect(() => {
    const channel = supabase
      .channel('inbox_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as { conversation_id: string }
        if (selectedId && newMsg.conversation_id === selectedId) {
          getMessages(selectedId).then(setMessages).catch(() => {})
        }
        loadConversations()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => loadConversations())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId])

  const loadDetail = async (convId: string) => {
    try {
      const [msgs, nts] = await Promise.all([getMessages(convId), getInternalNotes(convId)])
      setMessages(msgs)
      setNotes(nts)
      await markConversationRead(convId)
      // Update local state
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, is_unread: false } : c))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    }
  }

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
  }, [selectedId])

  const handleSend = async () => {
    if (!selectedId || !replyText.trim()) return
    try {
      const msg = await sendMessage(selectedId, replyText.trim())
      setMessages((prev) => [...prev, msg])
      setReplyText('')
      setConversations((prev) => prev.map((c) =>
        c.id === selectedId ? { ...c, last_message_preview: msg.content ?? '', last_message_at: msg.created_at } : c
      ))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ارسال پیام')
    }
  }

  const handleAddNote = async () => {
    if (!selectedId || !noteText.trim()) return
    try {
      await addInternalNote(selectedId, noteText.trim())
      const nts = await getInternalNotes(selectedId)
      setNotes(nts)
      setNoteText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    }
  }

  const handleAssign = async (employeeId: string) => {
    if (!selectedId) return
    try {
      await assignConversation(selectedId, employeeId)
      setConversations((prev) => prev.map((c) =>
        c.id === selectedId ? { ...c, assigned_employee_id: employeeId } : c
      ))
      setShowAssign(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!selectedId) return
    try {
      await updateConversationStatus(selectedId, status)
      setConversations((prev) => prev.map((c) =>
        c.id === selectedId ? { ...c, status } : c
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    }
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">صندوق ورودی</h1>
        <p className="text-sm text-neutral-500 mt-1">مکالمات تلگرام و واتساپ در یک مرکز</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Conversation list */}
        <div className="card flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b border-neutral-200 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="جستجو..."
                className="input pr-10 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {filterTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    filter === t.key ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    'w-full text-right p-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors flex items-start gap-3',
                    selectedId === conv.id && 'bg-primary-50',
                    conv.is_unread && 'bg-primary-50/50',
                  )}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 text-neutral-500 shrink-0 relative">
                    <User size={18} />
                    {conv.is_unread && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-neutral-900 truncate">
                        {conv.customer_name ?? conv.customer?.first_name ?? 'مشتری ناشناس'}
                      </p>
                      <span className="text-xs text-neutral-400 shrink-0">
                        {conv.last_message_at ? timeAgoPersian(conv.last_message_at) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {conv.last_message_preview ?? 'بدون پیام'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        conv.channel === 'telegram' ? 'bg-accent-100 text-accent-700' : 'bg-success-100 text-success-700',
                      )}>
                        {channelLabels[conv.channel] ?? conv.channel}
                      </span>
                      {conv.service && (
                        <span className="text-xs text-neutral-500">{conv.service.icon} {conv.service.name}</span>
                      )}
                      {conv.is_hot && <Flame size={12} className="text-error-500" />}
                      {conv.phone_number?.sim_label && (
                        <span className="text-xs text-neutral-400">{conv.phone_number.sim_label}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
            {!loading && conversations.length === 0 && (
              <div className="text-center py-12">
                <InboxIcon size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-500">مکالمه‌ای یافت نشد</p>
              </div>
            )}
          </div>
        </div>

        {/* Conversation detail */}
        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Header */}
              <div className="p-3 border-b border-neutral-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 text-primary-600 shrink-0">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-neutral-900 truncate">
                      {selected.customer_name ?? selected.customer?.first_name ?? 'مشتری ناشناس'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{channelLabels[selected.channel]}</span>
                      {selected.service && <span>{selected.service.icon} {selected.service.name}</span>}
                      {selected.phone_number?.sim_label && <span>{selected.phone_number.sim_label}</span>}
                      {selected.customer_phone && <span dir="ltr">{selected.customer_phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs rounded-lg border border-neutral-200 px-2 py-1 bg-white"
                  >
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => setShowNotes(!showNotes)} className="btn-ghost p-1.5" title="یادداشت‌های داخلی">
                    <StickyNote size={16} />
                  </button>
                  <button onClick={() => setShowAssign(!showAssign)} className="btn-ghost p-1.5" title="اختصاص به کارمند">
                    <UsersIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Assign dropdown */}
              {showAssign && (
                <div className="p-3 border-b border-neutral-200 bg-neutral-50">
                  <p className="text-xs font-medium text-neutral-600 mb-2">اختصاص به کارمند</p>
                  <div className="flex flex-wrap gap-2">
                    {employees.filter((e) => e.status === 'active').map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleAssign(emp.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm border-2 transition-colors',
                          selected.assigned_employee_id === emp.id
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
                        )}
                      >
                        {emp.first_name} {emp.last_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.direction === 'inbound' ? 'justify-start' : 'justify-end')}
                  >
                    <div className={cn(
                      'max-w-[75%] rounded-xl px-3 py-2 text-sm',
                      msg.direction === 'inbound'
                        ? 'bg-neutral-100 text-neutral-800'
                        : 'bg-primary-600 text-white',
                    )}>
                      <p>{msg.content}</p>
                      <div className={cn(
                        'flex items-center gap-1 mt-1 text-xs',
                        msg.direction === 'inbound' ? 'text-neutral-400' : 'text-primary-200',
                      )}>
                        <span>{formatPersianTime(msg.created_at)}</span>
                        {msg.direction === 'outbound' && (
                          msg.delivery_status === 'pending' ? <Clock size={10} /> :
                          msg.delivery_status === 'sent' ? <CheckCircle2 size={10} /> :
                          msg.delivery_status === 'error' ? <AlertCircle size={10} /> : null
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm text-neutral-400">پیامی در این مکالمه وجود ندارد</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Internal notes panel */}
              {showNotes && (
                <div className="border-t border-neutral-200 p-3 bg-warning-50/50 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-neutral-700 mb-2">یادداشت‌های داخلی (ارسال نمی‌شوند)</p>
                  <div className="space-y-1.5 mb-2">
                    {notes.map((n) => (
                      <div key={n.id} className="text-xs text-neutral-600 bg-white rounded-lg p-2">
                        <p>{n.content}</p>
                        <p className="text-neutral-400 mt-1">{formatPersianDateTime(n.created_at)}</p>
                      </div>
                    ))}
                    {notes.length === 0 && <p className="text-xs text-neutral-400">یادداشتی ثبت نشده</p>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm"
                      placeholder="یادداشت داخلی..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote() }}
                    />
                    <button onClick={handleAddNote} className="btn-secondary text-sm">ثبت</button>
                  </div>
                </div>
              )}

              {/* Reply box */}
              <div className="p-3 border-t border-neutral-200">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    placeholder="پاسخ به مشتری..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                  />
                  <button onClick={handleSend} className="btn-primary p-2.5" disabled={!replyText.trim()}>
                    <Send size={18} />
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-1.5">
                  ⚠️ پیام‌ها به مشتری ارسال می‌شوند. برای یادداشت داخلی از دکمه یادداشت استفاده کنید.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <InboxIcon size={32} className="mx-auto text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-500">یک مکالمه را انتخاب کنید</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
