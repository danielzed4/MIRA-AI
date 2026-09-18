import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Building2, MessageSquare, Target, Phone, BookOpen, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPersianNumber } from '../lib/utils'

interface ServiceData {
  id: string
  name: string
  icon: string
  description: string | null
  color: string
}

interface ServiceStats {
  conversations: number
  leads: number
  hotLeads: number
  customers: number
  phoneNumbers: number
  kbItems: number
}

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [service, setService] = useState<ServiceData | null>(null)
  const [stats, setStats] = useState<ServiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    const load = async () => {
      try {
        const { data: svc, error: svcError } = await supabase
          .from('services')
          .select('id, name, icon, description, color, slug')
          .eq('slug', slug)
          .maybeSingle()
        if (svcError) throw svcError
        if (!svc) { setService(null); return }
        setService(svc)

        const [convs, leads, hotLeads, custs, pns, kb] = await Promise.all([
          supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('service_id', svc.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('service_id', svc.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('service_id', svc.id).eq('is_hot', true),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('preferred_service_id', svc.id),
          supabase.from('phone_number_services').select('phone_number_id', { count: 'exact', head: true }).eq('service_id', svc.id),
          supabase.from('knowledge_base_items').select('id', { count: 'exact', head: true }).eq('knowledge_base_id',
            (await supabase.from('knowledge_bases').select('id').eq('service_id', svc.id).maybeSingle()).data?.id ?? ''),
        ])

        setStats({
          conversations: convs.count ?? 0,
          leads: leads.count ?? 0,
          hotLeads: hotLeads.count ?? 0,
          customers: custs.count ?? 0,
          phoneNumbers: pns.count ?? 0,
          kbItems: kb.count ?? 0,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در بارگذاری خدمت')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
  }
  if (!service) {
    return <Navigate to="/" replace />
  }

  const cards = [
    { label: 'مکالمات', value: stats?.conversations ?? 0, icon: MessageSquare, color: 'bg-primary-50 text-primary-600' },
    { label: 'سرنخ‌ها', value: stats?.leads ?? 0, icon: Target, color: 'bg-accent-50 text-accent-600' },
    { label: 'سرنخ‌های داغ', value: stats?.hotLeads ?? 0, icon: Target, color: 'bg-error-50 text-error-600' },
    { label: 'مشتریان', value: stats?.customers ?? 0, icon: Users, color: 'bg-success-50 text-success-600' },
    { label: 'شماره‌های متصل', value: stats?.phoneNumbers ?? 0, icon: Phone, color: 'bg-primary-50 text-primary-600' },
    { label: 'مورد دانش‌نامه', value: stats?.kbItems ?? 0, icon: BookOpen, color: 'bg-accent-50 text-accent-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 text-2xl">
          {service.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{service.name}</h1>
          {service.description && <p className="text-sm text-neutral-500 mt-1">{service.description}</p>}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} className="text-neutral-500" />
          <h2 className="font-semibold text-neutral-900">اطلاعات خدمت</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">نام:</span> <span className="font-medium text-neutral-900">{service.name}</span>
          </div>
          <div>
            <span className="text-neutral-500">شناسه:</span> <span className="font-medium text-neutral-900" dir="ltr">{slug}</span>
          </div>
          <div>
            <span className="text-neutral-500">رنگ:</span> <span className="font-medium text-neutral-900">{service.color}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
