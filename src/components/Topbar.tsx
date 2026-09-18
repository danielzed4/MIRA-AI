import { Menu, Search, Bell, CheckCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/platform'
import type { Notification } from '../types'
import { timeAgoPersian, cn } from '../lib/utils'

const typeIcons: Record<string, string> = {
  new_customer: '👤', new_message: '💬', unread_message: '📨',
  hot_lead: '🔥', follow_up: '📅', content_pending: '📝',
  telegram_disconnected: '⚠️', whatsapp_disconnected: '⚠️',
  integration_error: '⚠️', ai_review: '🤖',
}

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    } catch { /* silent */ }
  }

  useEffect(() => {
    loadNotifications()
    const channel = supabase
      .channel('notifications_topbar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => loadNotifications())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleMarkAll = async () => {
    try { await markAllNotificationsRead(); await loadNotifications() }
    catch { /* silent */ }
  }

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      try { await markNotificationRead(n.id); await loadNotifications() }
      catch { /* silent */ }
    }
    setShowNotifications(false)
    if (n.type === 'new_message' || n.type === 'unread_message') navigate('/inbox')
    else if (n.type === 'hot_lead' || n.type === 'follow_up') navigate('/leads')
    else if (n.type === 'new_customer') navigate('/customers')
    else if (n.type === 'content_pending') navigate('/content')
    else if (n.type === 'ai_review') navigate('/ai-assistant')
    else navigate('/notifications')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/customers?q=${encodeURIComponent(searchQuery.trim())}`)
    setSearchQuery('')
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-neutral-200 flex items-center gap-4 px-4 lg:px-6">
      <button onClick={onMenuClick} className="btn-ghost p-2 lg:hidden" aria-label="منو">
        <Menu size={20} />
      </button>

      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="جستجوی مشتریان، سرنخ‌ها، مکالمات..."
            className="input pr-10 bg-neutral-50 border-neutral-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      <div className="flex items-center gap-2 mr-auto">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          <span className="text-xs font-medium text-success-700">سیستم آنلاین</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-ghost p-2 relative"
            aria-label="اعلان‌ها"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-error-500 text-white text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute left-0 mt-2 w-80 card p-4 z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-neutral-900">اعلان‌های اخیر</p>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAll} className="text-xs text-primary-600 flex items-center gap-1 hover:underline">
                      <CheckCheck size={12} /> خواندن همه
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-neutral-50',
                        !n.is_read && 'bg-primary-50/50',
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <span className="text-lg">{typeIcons[n.type] ?? '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900">{n.title}</p>
                        {n.body && <p className="text-xs text-neutral-500">{n.body}</p>}
                        <p className="text-xs text-neutral-400 mt-0.5">{timeAgoPersian(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-sm text-neutral-500 text-center py-4">اعلان جدیدی وجود ندارد</p>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { setShowNotifications(false); navigate('/notifications') }}
                      className="w-full text-center text-xs text-primary-600 hover:underline pt-2"
                    >
                      مشاهده همه اعلان‌ها
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
