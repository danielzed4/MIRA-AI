import { useEffect, useState } from 'react'
import { Bell, CheckCheck, X, Trash2, Filter } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../api/platform'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types'
import { cn, timeAgoPersian } from '../lib/utils'

const typeIcons: Record<string, string> = {
  new_customer: '👤', new_message: '💬', unread_message: '📨',
  hot_lead: '🔥', follow_up: '📅', content_pending: '📝',
  telegram_disconnected: '⚠️', whatsapp_disconnected: '⚠️',
  integration_error: '⚠️', ai_review: '🤖',
}

const typeLabels: Record<string, string> = {
  new_customer: 'مشتری جدید', new_message: 'پیام جدید', unread_message: 'پیام خوانده نشده',
  hot_lead: 'سرنخ داغ', follow_up: 'پیگیری', content_pending: 'محتوای در انتظار',
  telegram_disconnected: 'قطع تلگرام', whatsapp_disconnected: 'قطع واتساپ',
  integration_error: 'خطای اتصال', ai_review: 'بررسی هوش مصنوعی',
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const load = async () => {
    setLoading(true)
    try { setNotifications(await getNotifications()) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('notifications_page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleMarkRead = async (id: string) => {
    try { await markNotificationRead(id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleMarkAll = async () => {
    try { await markAllNotificationsRead(); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const handleDelete = async (id: string) => {
    try { await deleteNotification(id); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'خطا') }
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">اعلان‌ها</h1>
          <p className="text-sm text-neutral-500 mt-1">{unreadCount > 0 ? `${unreadCount} اعلان خوانده نشده` : 'همه اعلان‌ها خوانده شده'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-secondary"><CheckCheck size={16} />خواندن همه</button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Filter size={16} className="text-neutral-400" />
        {[
          { key: 'all' as const, label: 'همه' },
          { key: 'unread' as const, label: 'خوانده نشده' },
          { key: 'read' as const, label: 'خوانده شده' },
        ].map((f) => (
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
        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n.id} className={cn('card p-4 flex items-start gap-3', !n.is_read && 'bg-primary-50/50 border-primary-200')}>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-100 text-lg shrink-0">
                {typeIcons[n.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                  <span className="text-xs text-neutral-400">{typeLabels[n.type] ?? n.type}</span>
                </div>
                {n.body && <p className="text-sm text-neutral-500 mt-0.5">{n.body}</p>}
                <p className="text-xs text-neutral-400 mt-1">{timeAgoPersian(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n.id)} className="btn-ghost p-1.5 text-xs" title="علامت‌گذاری به عنوان خوانده شده">
                    <CheckCheck size={14} />
                  </button>
                )}
                <button onClick={() => handleDelete(n.id)} className="btn-ghost p-1.5 text-error-500 hover:bg-error-50" title="حذف">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <Bell size={32} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-500">اعلانی وجود ندارد</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
