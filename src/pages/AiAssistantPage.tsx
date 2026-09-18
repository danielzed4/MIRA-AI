import { useEffect, useState, useRef } from 'react'
import { Bot, Send, Sparkles, AlertTriangle, CheckCircle2, Activity, Loader2 } from 'lucide-react'
import { getAiActions, createAiAction } from '../api/platform'
import { supabase } from '../lib/supabase'
import type { AiAction } from '../types'
import { cn, formatPersianDateTime } from '../lib/utils'

interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

const levelBadges: Record<string, { label: string; class: string }> = {
  auto: { label: 'خودکار', class: 'badge-success' },
  suggest: { label: 'پیشنهاد', class: 'badge-primary' },
  approval_required: { label: 'نیازمند تأیید', class: 'badge-warning' },
  blocked: { label: 'مسدود', class: 'badge-error' },
}

const sampleCommands = [
  'سرنخ‌های داغ امروز را نشان بده',
  'پیام‌های بدون پاسخ صرافی را پیدا کن',
  'این مکالمه را خلاصه کن',
  'برای اجاره خودرو یک تبلیغ بساز',
  'مشتری‌هایی که دنبال خانه هستند پیدا کن',
  'کدام کارمند بیشترین سرنخ را امروز دریافت کرده؟',
]

export function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'سلام! من دستیار هوشمند شرکت هستم. می‌توانم در زمینه طبقه‌بندی پیام‌ها، تشخیص نیت مشتری، خلاصه‌سازی مکالمات، پیشنهاد پاسخ، امتیازدهی سرنخ و تولید محتوا کمک کنم. چه کاری می‌توانم برایتان انجام دهم؟' },
  ])
  const [input, setInput] = useState('')
  const [actions, setActions] = useState<AiAction[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAiActions(20)
      .then((data) => setActions(data))
      .finally(() => setLoading(false))
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setSending(true)

    try {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ai_action_level', 'ai_confidence_threshold'])

      const actionLevel = settings?.find((s) => s.key === 'ai_action_level')?.value ?? 'suggest'
      const threshold = parseInt(settings?.find((s) => s.key === 'ai_confidence_threshold')?.value ?? '70', 10)

      let response = ''
      let actionType = 'query'
      let confidence = 0.85

      const lowerMsg = userMsg.toLowerCase()
      if (lowerMsg.includes('سرنخ') && lowerMsg.includes('داغ')) {
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('is_hot', true)
        response = `در حال حاضر ${count ?? 0} سرنخ داغ در سیستم ثبت شده است. برای مشاهده جزئیات به بخش «سرنخ‌ها» و فیلتر «داغ» مراجعه کنید.`
        actionType = 'lead_analysis'
        confidence = 0.92
      } else if (lowerMsg.includes('بدون پاسخ') || lowerMsg.includes('خوانده نشده')) {
        const { count } = await supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('is_unread', true)
        response = `${count ?? 0} مکالمه خوانده نشده وجود دارد. به بخش «صندوق ورودی» مراجعه کنید تا پاسخ دهید.`
        actionType = 'inbox_analysis'
        confidence = 0.88
      } else if (lowerMsg.includes('مشتری') && (lowerMsg.includes('خانه') || lowerMsg.includes('املاک'))) {
        const { count } = await supabase.from('customers').select('id', { count: 'exact', head: true })
        response = `در مجموع ${count ?? 0} مشتری در سیستم ثبت شده است. برای جستجوی مشتریان علاقه‌مند به املاک، از فیلتر خدمت «املاک» در صفحه مشتریان استفاده کنید.`
        actionType = 'customer_search'
        confidence = 0.80
      } else if (lowerMsg.includes('تبلیغ') || lowerMsg.includes('محتوا')) {
        response = `برای تولید محتوا، به بخش «مدیریت محتوا» بروید و یک محتوای جدید با نوع مناسب ایجاد کنید. می‌توانید وضعیت را روی «پیش‌نویس» بگذارید و پس از بازبینی منتشر کنید.`
        actionType = 'content_generation'
        confidence = 0.75
      } else if (lowerMsg.includes('کارمند') && lowerMsg.includes('سرنخ')) {
        const { data: leads } = await supabase.from('leads').select('assigned_employee_id').not('assigned_employee_id', 'is', null)
        const counts: Record<string, number> = {}
        leads?.forEach((l) => { counts[l.assigned_employee_id as string] = (counts[l.assigned_employee_id as string] ?? 0) + 1 })
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        if (top) {
          const { data: emp } = await supabase.from('employees').select('first_name, last_name').eq('id', top[0]).maybeSingle()
          response = `بیشترین سرنخ به ${emp?.first_name ?? ''} ${emp?.last_name ?? ''} اختصاص دارد (${top[1]} سرنخ).`
        } else {
          response = 'هیچ سرنخی به کارمندان اختصاص نیافته است.'
        }
        actionType = 'employee_stats'
        confidence = 0.90
      } else if (lowerMsg.includes('خلاصه') || lowerMsg.includes('مکالمه')) {
        const { count } = await supabase.from('conversations').select('id', { count: 'exact', head: true })
        response = `${count ?? 0} مکالمه در سیستم وجود دارد. برای خلاصه‌سازی یک مکالمه خاص، آن را در صندوق ورودی انتخاب کنید و از دستیار برای خلاصه‌سازی استفاده کنید.`
        actionType = 'conversation_summary'
        confidence = 0.78
      } else {
        response = `درخواست شما دریافت شد. می‌توانم در زمینه سرنخ‌ها، مشتریان، مکالمات، محتوا و گزارش‌ها کمک کنم. لطفاً جزئیات بیشتری بفرمایید.`
        actionType = 'general_query'
        confidence = 0.65
      }

      if (confidence * 100 < threshold) {
        response += '\n\n⚠️ این پاسخ با اطمینان پایین تولید شده و نیازمند بررسی است.'
      }

      await createAiAction({
        action_type: actionType,
        result: { query: userMsg, response },
        confidence,
        reasoning: `پرسش کاربر: ${userMsg}`,
        action_level: actionLevel,
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: response }])
      const refreshed = await getAiActions(20)
      setActions(refreshed)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'خطا در پردازش درخواست. لطفاً دوباره تلاش کنید.' }])
    } finally {
      setSending(false)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">دستیار هوشمند شرکت</h1>
        <p className="text-sm text-neutral-500 mt-1">طبقه‌بندی، پیشنهاد، خلاصه‌سازی و تولید محتوا</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="p-3 border-b border-neutral-200 flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-100 text-primary-600">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">دستیار هوشمند</p>
              <p className="text-xs text-success-600">آنلاین</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] rounded-xl px-4 py-2.5 text-sm',
                  msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-800',
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 rounded-xl px-4 py-2.5 text-sm">
                  <Loader2 size={16} className="animate-spin text-neutral-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="p-3 border-t border-neutral-200">
              <p className="text-xs text-neutral-400 mb-2">دستورات نمونه:</p>
              <div className="flex flex-wrap gap-2">
                {sampleCommands.map((cmd) => (
                  <button key={cmd} onClick={() => setInput(cmd)} className="text-xs px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t border-neutral-200">
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="سؤال یا دستور خود را بنویسید..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                disabled={sending}
              />
              <button onClick={handleSend} className="btn-primary p-2.5" disabled={!input.trim() || sending}>
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900">عملیات‌های اخیر هوش مصنوعی</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-6"><div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {actions.map((a) => {
                  const badge = levelBadges[a.action_level] ?? levelBadges.suggest
                  return (
                    <div key={a.id} className="p-3 rounded-lg bg-neutral-50">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-neutral-700">{a.action_type}</span>
                        <span className={cn(badge.class, 'text-xs')}>{badge.label}</span>
                      </div>
                      {a.reasoning && <p className="text-xs text-neutral-500">{a.reasoning}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary-500 h-full rounded-full" style={{ width: `${a.confidence * 100}%` }} />
                        </div>
                        <span className="text-xs text-neutral-500">{Math.round(a.confidence * 100)}%</span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">{formatPersianDateTime(a.created_at)}</p>
                    </div>
                  )
                })}
                {actions.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles size={24} className="mx-auto text-neutral-300 mb-2" />
                    <p className="text-xs text-neutral-500">هنوز عملیاتی ثبت نشده است</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">سطوح اقدام هوش مصنوعی</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs"><CheckCircle2 size={14} className="text-success-500" /><span className="text-neutral-600">خودکار: اقدامات امن داخلی</span></div>
              <div className="flex items-center gap-2 text-xs"><Sparkles size={14} className="text-primary-500" /><span className="text-neutral-600">پیشنهاد: نیازمند بررسی کارمند</span></div>
              <div className="flex items-center gap-2 text-xs"><AlertTriangle size={14} className="text-warning-500" /><span className="text-neutral-600">تأیید: نیازمند تأیید انسانی</span></div>
              <div className="flex items-center gap-2 text-xs"><AlertTriangle size={14} className="text-error-500" /><span className="text-neutral-600">مسدود: هرگز خودکار اجرا نمی‌شود</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
