import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquare, Target, TrendingUp, Phone, Bot } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPersianNumber } from '../lib/utils'

interface Analytics {
  totalCustomers: number
  totalLeads: number
  hotLeads: number
  wonLeads: number
  totalConversations: number
  unreadConversations: number
  totalMessages: number
  totalEmployees: number
  activeEmployees: number
  totalContent: number
  publishedContent: number
  totalCampaigns: number
  activeCampaigns: number
}

interface SimStats {
  id: string
  label: string
  simLabel: string | null
  messages: number
  leads: number
  hotLeads: number
}

export function ReportsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceStats, setServiceStats] = useState<{ name: string; icon: string; leads: number; customers: number; conversations: number }[]>([])
  const [simStats, setSimStats] = useState<SimStats[]>([])
  const [tgStatus, setTgStatus] = useState<string>('pending')
  const [waStatus, setWaStatus] = useState<string>('pending')

  useEffect(() => {
    const load = async () => {
      try {
        const [custs, leads, hotLeads, wonLeads, convs, unreadConvs, msgs, emps, activeEmps, content, pubContent, camps, actCamps] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_hot', true),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'won'),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
          supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread', true),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
          supabase.from('employees').select('id', { count: 'exact', head: true }),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('content').select('id', { count: 'exact', head: true }),
          supabase.from('content').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        ])

        setData({
          totalCustomers: custs.count ?? 0,
          totalLeads: leads.count ?? 0,
          hotLeads: hotLeads.count ?? 0,
          wonLeads: wonLeads.count ?? 0,
          totalConversations: convs.count ?? 0,
          unreadConversations: unreadConvs.count ?? 0,
          totalMessages: msgs.count ?? 0,
          totalEmployees: emps.count ?? 0,
          activeEmployees: activeEmps.count ?? 0,
          totalContent: content.count ?? 0,
          publishedContent: pubContent.count ?? 0,
          totalCampaigns: camps.count ?? 0,
          activeCampaigns: actCamps.count ?? 0,
        })

        const { data: services } = await supabase.from('services').select('id, name, icon').eq('is_active', true)
        if (services) {
          const stats = await Promise.all(services.map(async (s) => {
            const [leadCount, custCount, convCount] = await Promise.all([
              supabase.from('leads').select('id', { count: 'exact', head: true }).eq('service_id', s.id),
              supabase.from('customers').select('id', { count: 'exact', head: true }).eq('preferred_service_id', s.id),
              supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('service_id', s.id),
            ])
            return { name: s.name, icon: s.icon, leads: leadCount.count ?? 0, customers: custCount.count ?? 0, conversations: convCount.count ?? 0 }
          }))
          setServiceStats(stats)
        }

        const { data: phoneNumbers } = await supabase.from('phone_numbers').select('id, internal_name, sim_label').order('created_at')
        if (phoneNumbers) {
          const sims = await Promise.all(phoneNumbers.map(async (pn) => {
            const [msgs, lds, hot] = await Promise.all([
              supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('phone_number_id', pn.id),
              supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', pn.id),
              supabase.from('leads').select('id', { count: 'exact', head: true }).eq('phone_number_id', pn.id).eq('is_hot', true),
            ])
            return {
              id: pn.id,
              label: pn.internal_name,
              simLabel: pn.sim_label,
              messages: msgs.count ?? 0,
              leads: lds.count ?? 0,
              hotLeads: hot.count ?? 0,
            }
          }))
          setSimStats(sims)
        }
        const { data: intSettings } = await supabase.from('app_settings').select('key, value').in('key', ['telegram_status', 'whatsapp_status'])
        intSettings?.forEach((r: { key: string; value: string }) => {
          if (r.key === 'telegram_status') setTgStatus(r.value)
          if (r.key === 'whatsapp_status') setWaStatus(r.value)
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در بارگذاری گزارش‌ها')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !data) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }

  const cards = [
    { label: 'کل مشتریان', value: data.totalCustomers, icon: Users, color: 'bg-primary-50 text-primary-600' },
    { label: 'کل سرنخ‌ها', value: data.totalLeads, icon: Target, color: 'bg-accent-50 text-accent-600' },
    { label: 'سرنخ‌های داغ', value: data.hotLeads, icon: TrendingUp, color: 'bg-error-50 text-error-600' },
    { label: 'سرنخ‌های موفق', value: data.wonLeads, icon: Target, color: 'bg-success-50 text-success-600' },
    { label: 'کل مکالمات', value: data.totalConversations, icon: MessageSquare, color: 'bg-primary-50 text-primary-600' },
    { label: 'مکالمات خوانده نشده', value: data.unreadConversations, icon: MessageSquare, color: 'bg-warning-50 text-warning-600' },
    { label: 'کل پیام‌ها', value: data.totalMessages, icon: MessageSquare, color: 'bg-accent-50 text-accent-600' },
    { label: 'کارکنان فعال', value: data.activeEmployees, icon: Users, color: 'bg-success-50 text-success-600' },
    { label: 'محتوای منتشر شده', value: data.publishedContent, icon: BarChart3, color: 'bg-primary-50 text-primary-600' },
    { label: 'کمپین‌های فعال', value: data.activeCampaigns, icon: BarChart3, color: 'bg-accent-50 text-accent-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">گزارش‌ها</h1>
        <p className="text-sm text-neutral-500 mt-1">تحلیل و گزارش‌های سیستم</p>
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${c.color} mb-2`}>
              <c.icon size={18} />
            </div>
            <p className="text-xl font-bold text-neutral-900 persian-nums">{formatPersianNumber(c.value)}</p>
            <p className="text-xs text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-neutral-900 mb-4">عملکرد خدمات</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-neutral-200">
              <tr>
                <th className="table-header px-4 py-2">خدمت</th>
                <th className="table-header px-4 py-2">سرنخ‌ها</th>
                <th className="table-header px-4 py-2">مشتریان</th>
                <th className="table-header px-4 py-2">مکالمات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {serviceStats.map((s) => (
                <tr key={s.name} className="hover:bg-neutral-50">
                  <td className="table-cell">{s.icon} {s.name}</td>
                  <td className="table-cell persian-nums">{formatPersianNumber(s.leads)}</td>
                  <td className="table-cell persian-nums">{formatPersianNumber(s.customers)}</td>
                  <td className="table-cell persian-nums">{formatPersianNumber(s.conversations)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simStats.map((sim, idx) => (
          <div key={sim.id} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={18} className={idx === 0 ? 'text-primary-500' : 'text-accent-500'} />
              <h3 className="font-semibold text-neutral-900">{sim.simLabel ?? sim.label}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">پیام‌ها</span><span className="font-medium persian-nums">{formatPersianNumber(sim.messages)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">سرنخ‌ها</span><span className="font-medium persian-nums">{formatPersianNumber(sim.leads)}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">سرنخ‌های داغ</span><span className="font-medium persian-nums">{formatPersianNumber(sim.hotLeads)}</span></div>
            </div>
          </div>
        ))}
        {simStats.length === 0 && (
          <div className="col-span-full card p-8 text-center">
            <Phone size={28} className="mx-auto text-neutral-300 mb-2" />
            <p className="text-sm text-neutral-500">شماره‌ای ثبت نشده است</p>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={18} className="text-neutral-500" />
          <h3 className="font-semibold text-neutral-900">وضعیت سیستم</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success-500" /><span className="text-neutral-600">پایگاه داده: سالم</span></div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success-500" /><span className="text-neutral-600">بلادرنگ: سالم</span></div>
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${tgStatus === 'connected' ? 'bg-success-500' : tgStatus === 'error' ? 'bg-error-500' : 'bg-warning-400'}`} /><span className="text-neutral-600">تلگرام: {tgStatus === 'connected' ? 'متصل' : tgStatus === 'error' ? 'خطا' : 'در انتظار'}</span></div>
          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${waStatus === 'connected' ? 'bg-success-500' : waStatus === 'error' ? 'bg-error-500' : 'bg-warning-400'}`} /><span className="text-neutral-600">واتساپ: {waStatus === 'connected' ? 'متصل' : waStatus === 'error' ? 'خطا' : 'در انتظار'}</span></div>
        </div>
      </div>
    </div>
  )
}
