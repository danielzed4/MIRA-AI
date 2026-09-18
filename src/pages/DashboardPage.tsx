import { useEffect, useState } from 'react'
import {
  Users, MessageSquare, MessageCircleOff, Target, Flame, CheckCircle2,
  CalendarClock, Phone, Send, Database, Bot, Server, Activity,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPersianNumber } from '../lib/utils'

interface StatCardProps {
  label: string
  value: number
  icon: typeof Users
  color: 'primary' | 'accent' | 'success' | 'warning' | 'error'
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  }
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-neutral-900 persian-nums">{formatPersianNumber(value)}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  )
}

function SimCard({ name, scope, messages, leads, hotLeads, color }: {
  name: string
  scope: string
  messages: number
  leads: number
  hotLeads: number
  color: 'blue' | 'amber'
}) {
  const colorClass = color === 'blue' ? 'from-primary-500 to-primary-700' : 'from-accent-500 to-accent-700'
  return (
    <div className={`rounded-xl p-5 bg-gradient-to-br ${colorClass} text-white shadow-card`}>
      <div className="flex items-center gap-2 mb-1">
        <Phone size={18} />
        <h3 className="font-semibold">{name}</h3>
      </div>
      <p className="text-xs opacity-80 mb-4">{scope}</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/15 rounded-lg p-3">
          <p className="text-lg font-bold persian-nums">{formatPersianNumber(messages)}</p>
          <p className="text-xs opacity-80">پیام‌ها</p>
        </div>
        <div className="bg-white/15 rounded-lg p-3">
          <p className="text-lg font-bold persian-nums">{formatPersianNumber(leads)}</p>
          <p className="text-xs opacity-80">سرنخ‌ها</p>
        </div>
        <div className="bg-white/15 rounded-lg p-3">
          <p className="text-lg font-bold persian-nums">{formatPersianNumber(hotLeads)}</p>
          <p className="text-xs opacity-80">سرنخ داغ</p>
        </div>
      </div>
    </div>
  )
}

function SystemStatus() {
  const [tgStatus, setTgStatus] = useState<string>('pending')
  const [waStatus, setWaStatus] = useState<string>('pending')

  useEffect(() => {
    supabase.from('app_settings').select('key, value').in('key', ['telegram_status', 'whatsapp_status']).then(({ data }) => {
      data?.forEach((r: { key: string; value: string }) => {
        if (r.key === 'telegram_status') setTgStatus(r.value)
        if (r.key === 'whatsapp_status') setWaStatus(r.value)
      })
    })
  }, [])

  const services = [
    { name: 'Database', label: 'پایگاه داده', status: 'healthy' },
    { name: 'Realtime', label: 'بلادرنگ', status: 'healthy' },
    { name: 'Storage', label: 'ذخیره‌سازی', status: 'healthy' },
    { name: 'AI', label: 'هوش مصنوعی', status: 'healthy' },
    { name: 'Telegram', label: 'تلگرام', status: tgStatus === 'connected' ? 'healthy' : tgStatus === 'error' ? 'error' : 'pending' },
    { name: 'WhatsApp', label: 'واتساپ', status: waStatus === 'connected' ? 'healthy' : waStatus === 'error' ? 'error' : 'pending' },
    { name: 'Queue', label: 'صف پردازش', status: 'healthy' },
    { name: 'Webhooks', label: 'وب‌هوک', status: 'pending' },
  ]
  const statusMap = {
    healthy: { dot: 'bg-success-500', text: 'text-success-600', label: 'سالم' },
    pending: { dot: 'bg-warning-400', text: 'text-warning-600', label: 'آماده نشده' },
    error: { dot: 'bg-error-500', text: 'text-error-600', label: 'خطا' },
  }
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-neutral-500" />
        <h3 className="font-semibold text-neutral-900">وضعیت سیستم</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {services.map((s) => {
          const st = statusMap[s.status as keyof typeof statusMap]
          return (
            <div key={s.name} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IntegrationStatusCard({ icon: Icon, label, settingKey }: {
  icon: typeof Send
  label: string
  settingKey: string
}) {
  const [status, setStatus] = useState<string>('pending')
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', settingKey).maybeSingle()
      .then(({ data }) => setStatus(data?.value ?? 'pending'))
  }, [settingKey])
  const config = status === 'connected'
    ? { bg: 'bg-success-50', text: 'text-success-600', label: 'متصل' }
    : status === 'error'
    ? { bg: 'bg-error-50', text: 'text-error-600', label: 'خطا' }
    : { bg: 'bg-warning-50', text: 'text-warning-600', label: 'در انتظار اتصال' }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.bg} ${config.text}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className={`text-xs ${config.text}`}>{config.label}</p>
      </div>
    </div>
  )
}


export function DashboardPage() {
  const [stats, setStats] = useState<StatCardProps[]>([
    { label: 'مشتریان جدید امروز', value: 0, icon: Users, color: 'primary' },
    { label: 'پیام‌های جدید', value: 0, icon: MessageSquare, color: 'accent' },
    { label: 'پیام‌های بدون پاسخ', value: 0, icon: MessageCircleOff, color: 'error' },
    { label: 'سرنخ‌های فعال', value: 0, icon: Target, color: 'primary' },
    { label: 'سرنخ‌های داغ', value: 0, icon: Flame, color: 'warning' },
    { label: 'تبدیل‌های موفق', value: 0, icon: CheckCircle2, color: 'success' },
    { label: 'پیگیری‌های امروز', value: 0, icon: CalendarClock, color: 'accent' },
    { label: 'تبادل داده', value: 0, icon: MessageSquare, color: 'primary' },
  ])
  const [simStats, setSimStats] = useState({
    sim1: { messages: 0, leads: 0, hotLeads: 0 },
    sim2: { messages: 0, leads: 0, hotLeads: 0 },
  })
  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setDashLoading(true)
      setDashError(null)
      try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const [
        newCustomers, newMessages, unreadConvs, activeLeads,
        hotLeads, wonLeads, followUps,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound').gte('created_at', todayStr),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread', true),
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'negotiating', 'follow_up']),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_hot', true),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'won'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).not('next_follow_up', 'is', null),
      ])

      setStats([
        { label: 'مشتریان جدید امروز', value: newCustomers.count ?? 0, icon: Users, color: 'primary' },
        { label: 'پیام‌های جدید', value: newMessages.count ?? 0, icon: MessageSquare, color: 'accent' },
        { label: 'پیام‌های بدون پاسخ', value: unreadConvs.count ?? 0, icon: MessageCircleOff, color: 'error' },
        { label: 'سرنخ‌های فعال', value: activeLeads.count ?? 0, icon: Target, color: 'primary' },
        { label: 'سرنخ‌های داغ', value: hotLeads.count ?? 0, icon: Flame, color: 'warning' },
        { label: 'تبدیل‌های موفق', value: wonLeads.count ?? 0, icon: CheckCircle2, color: 'success' },
        { label: 'پیگیری‌های امروز', value: followUps.count ?? 0, icon: CalendarClock, color: 'accent' },
        { label: 'تبادل داده', value: 0, icon: MessageSquare, color: 'primary' },
      ])

      // SIM stats
      const { data: phoneNumbers } = await supabase.from('phone_numbers').select('id, sim_label')
      const sim1 = phoneNumbers?.find((pn) => pn.sim_label === 'SIM 01')
      const sim2 = phoneNumbers?.find((pn) => pn.sim_label === 'SIM 02')

      if (sim1) {
        const [msgs, lds, hot] = await Promise.all([
          supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim1.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim1.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim1.id).eq('is_hot', true),
        ])
        setSimStats((prev) => ({ ...prev, sim1: { messages: msgs.count ?? 0, leads: lds.count ?? 0, hotLeads: hot.count ?? 0 } }))
      }
      if (sim2) {
        const [msgs, lds, hot] = await Promise.all([
          supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim2.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim2.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', sim2.id).eq('is_hot', true),
        ])
        setSimStats((prev) => ({ ...prev, sim2: { messages: msgs.count ?? 0, leads: lds.count ?? 0, hotLeads: hot.count ?? 0 } }))
      }
      } catch (e) {
        setDashError(e instanceof Error ? e.message : 'خطا در بارگذاری داشبورد')
      } finally {
        setDashLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">داشبورد مدیریتی</h1>
        <p className="text-sm text-neutral-500 mt-1">نمای کلی عملکرد شرکت — امروز</p>
      </div>

      {dashError && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{dashError}</div>}

      {dashLoading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      )}

      {!dashLoading && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SimCard
          name="سیم‌کارت ۱"
          scope="💱 خدمات مالی و املاک"
          messages={simStats.sim1.messages}
          leads={simStats.sim1.leads}
          hotLeads={simStats.sim1.hotLeads}
          color="blue"
        />
        <SimCard
          name="سیم‌کارت ۲"
          scope="🛠️ خدمات عمومی"
          messages={simStats.sim2.messages}
          leads={simStats.sim2.leads}
          hotLeads={simStats.sim2.hotLeads}
          color="amber"
        />
        <SystemStatus />
      </div>
      )}

      {!dashLoading && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success-50 text-success-600">
            <Database size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">پایگاه داده</p>
            <p className="text-xs text-success-600">متصل</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success-50 text-success-600">
            <Bot size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">دستیار هوشمند</p>
            <p className="text-xs text-success-600">فعال</p>
          </div>
        </div>
        <IntegrationStatusCard icon={Send} label="تلگرام" settingKey="telegram_status" />
        <IntegrationStatusCard icon={Server} label="واتساپ بیزینس" settingKey="whatsapp_status" />
      </div>
      )}
    </div>
  )
}
