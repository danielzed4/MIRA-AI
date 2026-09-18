import { useState, useEffect } from 'react'
import {
  User, Building2, Phone, Send, MessageSquare, Bot, Bell,
  Shield, Users, Lock, Palette, Globe, Calendar, Database, Server,
  Save, Check, Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const sections = [
  { id: 'account', label: 'حساب کاربری', icon: User },
  { id: 'services', label: 'خدمات', icon: Building2 },
  { id: 'phone-numbers', label: 'شماره‌ها', icon: Phone },
  { id: 'telegram', label: 'تلگرام', icon: Send },
  { id: 'whatsapp', label: 'واتساپ', icon: MessageSquare },
  { id: 'ai', label: 'هوش مصنوعی', icon: Bot },
  { id: 'notifications', label: 'اعلان‌ها', icon: Bell },
  { id: 'security', label: 'امنیت', icon: Shield },
  { id: 'employees', label: 'کارکنان', icon: Users },
  { id: 'access', label: 'دسترسی‌ها', icon: Lock },
  { id: 'appearance', label: 'ظاهر', icon: Palette },
  { id: 'language', label: 'زبان', icon: Globe },
  { id: 'datetime', label: 'تاریخ و زمان', icon: Calendar },
  { id: 'storage', label: 'ذخیره‌سازی', icon: Database },
  { id: 'system', label: 'سیستم', icon: Server },
]

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('account')
  const { profile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [serviceCount, setServiceCount] = useState(0)
  const [phoneCount, setPhoneCount] = useState(0)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [roleCount, setRoleCount] = useState(0)
  const [tgTestStatus, setTgTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [tgTestMsg, setTgTestMsg] = useState<string | null>(null)
  const [waTestStatus, setWaTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [waTestMsg, setWaTestMsg] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setEmail(profile.email ?? '')
    }
    const load = async () => {
      const { data: s } = await supabase.from('app_settings').select('key, value')
      const map: Record<string, string> = {}
      s?.forEach((r: { key: string; value: string }) => { map[r.key] = r.value })
      setSettings(map)

      const [svcs, pns, emps, roles] = await Promise.all([
        supabase.from('services').select('id', { count: 'exact', head: true }),
        supabase.from('phone_numbers').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('roles').select('id', { count: 'exact', head: true }),
      ])
      setServiceCount(svcs.count ?? 0)
      setPhoneCount(pns.count ?? 0)
      setEmployeeCount(emps.count ?? 0)
      setRoleCount(roles.count ?? 0)
    }
    load()
  }, [profile])

  const handleSaveAccount = async () => {
    if (!profile) return
    setSaving(true)
    setSaved(false)
    try {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', profile.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase.from('app_settings').upsert({ key, value })
      if (error) throw error
      setSettings((prev) => ({ ...prev, [key]: value }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleSaveMultiple = async (entries: { key: string; value: string }[]) => {
    setSaving(true)
    setSaved(false)
    try {
      const { error } = await supabase.from('app_settings').upsert(entries)
      if (error) throw error
      setSettings((prev) => {
        const next = { ...prev }
        for (const e of entries) next[e.key] = e.value
        return next
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const testTelegram = async () => {
    const token = settings['telegram_bot_token']?.trim()
    if (!token) {
      setTgTestStatus('fail')
      setTgTestMsg('ابتدا Bot Token را وارد و ذخیره کنید')
      return
    }
    setTgTestStatus('testing')
    setTgTestMsg(null)
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
      const data = await res.json()
      if (data.ok) {
        setTgTestStatus('ok')
        setTgTestMsg(`متصل — ربات @${data.result.username} فعال است`)
        await handleSaveMultiple([
          { key: 'telegram_bot_token', value: token },
          { key: 'telegram_api_id', value: settings['telegram_api_id'] ?? '' },
          { key: 'telegram_api_hash', value: settings['telegram_api_hash'] ?? '' },
          { key: 'telegram_status', value: 'connected' },
          { key: 'telegram_bot_username', value: data.result.username ?? '' },
        ])
      } else {
        setTgTestStatus('fail')
        setTgTestMsg(data.description ?? 'توکن نامعتبر است')
        await handleSaveSetting('telegram_status', 'error')
      }
    } catch {
      setTgTestStatus('fail')
      setTgTestMsg('اتصال به سرور تلگرام برقرار نشد')
      await handleSaveSetting('telegram_status', 'error')
    }
  }

  const testWhatsApp = async () => {
    const token = settings['whatsapp_api_token']?.trim()
    const phoneId = settings['whatsapp_phone_number_id']?.trim()
    if (!token || !phoneId) {
      setWaTestStatus('fail')
      setWaTestMsg('ابتدا API Token و Phone Number ID را وارد و ذخیره کنید')
      return
    }
    setWaTestStatus('testing')
    setWaTestMsg(null)
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}?access_token=${token}`)
      const data = await res.json()
      if (data.id) {
        setWaTestStatus('ok')
        setWaTestMsg('متصل — شماره واتساپ تأیید شد')
        await handleSaveMultiple([
          { key: 'whatsapp_api_token', value: token },
          { key: 'whatsapp_phone_number_id', value: phoneId },
          { key: 'whatsapp_status', value: 'connected' },
        ])
      } else {
        setWaTestStatus('fail')
        setWaTestMsg(data.error?.message ?? 'توکن یا شماره نامعتبر است')
        await handleSaveSetting('whatsapp_status', 'error')
      }
    } catch {
      setWaTestStatus('fail')
      setWaTestMsg('اتصال به سرور واتساپ برقرار نشد')
      await handleSaveSetting('whatsapp_status', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">تنظیمات</h1>
        <p className="text-sm text-neutral-500 mt-1">مدیریت تنظیمات سیستم و حساب کاربری</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card p-3 lg:col-span-1">
          <div className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'sidebar-item w-full text-right',
                  activeSection === s.id && 'sidebar-item-active',
                )}
              >
                <s.icon size={18} className="shrink-0" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              {sections.find((s) => s.id === activeSection)?.label}
            </h2>
            <div className="space-y-4">
              {activeSection === 'account' && (
                <>
                  <div>
                    <label className="label">نام نمایشی</label>
                    <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">ایمیل</label>
                    <input className="input" dir="ltr" value={email} readOnly disabled />
                  </div>
                  <div>
                    <label className="label">شماره تماس</label>
                    <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+374..." />
                  </div>
                  <button onClick={handleSaveAccount} className="btn-primary" disabled={saving}>
                    {saving ? 'در حال ذخیره...' : saved ? <><Check size={16} /> ذخیره شد</> : <><Save size={16} /> ذخیره تغییرات</>}
                  </button>
                </>
              )}

              {activeSection === 'services' && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">مدیریت خدمات از صفحه «خدمات شرکت» قابل انجام است.</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">تعداد خدمات فعال</span>
                    <span className="text-sm font-medium text-neutral-900">{serviceCount}</span>
                  </div>
                </div>
              )}

              {activeSection === 'phone-numbers' && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">مدیریت شماره‌ها و سیم‌کارت‌ها از صفحه «شماره‌ها و حساب‌ها» قابل انجام است.</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">تعداد شماره‌های ثبت شده</span>
                    <span className="text-sm font-medium text-neutral-900">{phoneCount}</span>
                  </div>
                </div>
              )}

              {activeSection === 'telegram' && (
                <div className="space-y-4">
                  <div>
                    <label className="label">Bot Token تلگرام</label>
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="123456:ABC-DEF..."
                      value={settings['telegram_bot_token'] ?? ''}
                      onChange={(e) => setSettings((p) => ({ ...p, telegram_bot_token: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">API ID</label>
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="1234567"
                      value={settings['telegram_api_id'] ?? ''}
                      onChange={(e) => setSettings((p) => ({ ...p, telegram_api_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">API Hash</label>
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="a1b2c3d4..."
                      value={settings['telegram_api_hash'] ?? ''}
                      onChange={(e) => setSettings((p) => ({ ...p, telegram_api_hash: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveMultiple([
                      { key: 'telegram_bot_token', value: settings['telegram_bot_token'] ?? '' },
                      { key: 'telegram_api_id', value: settings['telegram_api_id'] ?? '' },
                      { key: 'telegram_api_hash', value: settings['telegram_api_hash'] ?? '' },
                    ])} className="btn-primary" disabled={saving}>
                      {saving ? 'ذخیره...' : saved ? <><Check size={16} /> ذخیره شد</> : <><Save size={16} /> ذخیره تنظیمات تلگرام</>}
                    </button>
                    <button onClick={testTelegram} className="btn-secondary" disabled={tgTestStatus === 'testing'}>
                      {tgTestStatus === 'testing' ? <><Loader2 size={16} className="animate-spin" /> آزمایش...</> : <><Send size={16} /> آزمایش اتصال</>}
                    </button>
                  </div>
                  {tgTestStatus === 'ok' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm">
                      <Check size={16} /> {tgTestMsg}
                    </div>
                  )}
                  {tgTestStatus === 'fail' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
                      <AlertCircle size={16} /> {tgTestMsg}
                    </div>
                  )}
                  {settings['telegram_status'] === 'connected' && tgTestStatus === 'idle' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm">
                      <Check size={16} /> اتصال تلگرام فعال است
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'whatsapp' && (
                <div className="space-y-4">
                  <div>
                    <label className="label">WhatsApp Business API Token</label>
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="EAAJ..."
                      value={settings['whatsapp_api_token'] ?? ''}
                      onChange={(e) => setSettings((p) => ({ ...p, whatsapp_api_token: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Phone Number ID</label>
                    <input
                      className="input"
                      dir="ltr"
                      placeholder="123456789"
                      value={settings['whatsapp_phone_number_id'] ?? ''}
                      onChange={(e) => setSettings((p) => ({ ...p, whatsapp_phone_number_id: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveMultiple([
                      { key: 'whatsapp_api_token', value: settings['whatsapp_api_token'] ?? '' },
                      { key: 'whatsapp_phone_number_id', value: settings['whatsapp_phone_number_id'] ?? '' },
                    ])} className="btn-primary" disabled={saving}>
                      {saving ? 'ذخیره...' : saved ? <><Check size={16} /> ذخیره شد</> : <><Save size={16} /> ذخیره تنظیمات واتساپ</>}
                    </button>
                    <button onClick={testWhatsApp} className="btn-secondary" disabled={waTestStatus === 'testing'}>
                      {waTestStatus === 'testing' ? <><Loader2 size={16} className="animate-spin" /> آزمایش...</> : <><MessageSquare size={16} /> آزمایش اتصال</>}
                    </button>
                  </div>
                  {waTestStatus === 'ok' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm">
                      <Check size={16} /> {waTestMsg}
                    </div>
                  )}
                  {waTestStatus === 'fail' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
                      <AlertCircle size={16} /> {waTestMsg}
                    </div>
                  )}
                  {settings['whatsapp_status'] === 'connected' && waTestStatus === 'idle' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm">
                      <Check size={16} /> اتصال واتساپ فعال است
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'ai' && (
                <div className="space-y-4">
                  <div>
                    <label className="label">سطح خودکارسازی</label>
                    <select
                      className="input"
                      value={settings['ai_action_level'] ?? 'suggest'}
                      onChange={(e) => { setSettings((p) => ({ ...p, ai_action_level: e.target.value })); handleSaveSetting('ai_action_level', e.target.value) }}
                    >
                      <option value="auto">خودکار — اقدامات امن خودکار اجرا شوند</option>
                      <option value="suggest">پیشنهاد — همه پیشنهاد نمایش داده شوند</option>
                      <option value="approval_required">تأیید — همه نیازمند تأیید انسانی</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">حد اطمینان (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input"
                      value={settings['ai_confidence_threshold'] ?? '70'}
                      onChange={(e) => setSettings((p) => ({ ...p, ai_confidence_threshold: e.target.value }))}
                    />
                  </div>
                  <button onClick={() => handleSaveSetting('ai_confidence_threshold', settings['ai_confidence_threshold'] ?? '70')} className="btn-primary" disabled={saving}>
                    {saving ? 'ذخیره...' : 'ذخیره تنظیمات هوش مصنوعی'}
                  </button>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-3">
                  {[
                    { key: 'notif_new_customer', label: 'اعلان مشتری جدید' },
                    { key: 'notif_new_message', label: 'اعلان پیام جدید' },
                    { key: 'notif_hot_lead', label: 'اعلان سرنخ داغ' },
                    { key: 'notif_follow_up', label: 'یادآوری پیگیری' },
                  ].map((n) => (
                    <label key={n.key} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 cursor-pointer">
                      <span className="text-sm text-neutral-600">{n.label}</span>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-neutral-300 text-primary-600"
                        checked={settings[n.key] !== 'false'}
                        onChange={(e) => handleSaveSetting(n.key, e.target.checked ? 'true' : 'false')}
                      />
                    </label>
                  ))}
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-3">
                  <div>
                    <label className="label">بازه نشست (دقیقه)</label>
                    <input
                      type="number"
                      className="input"
                      value={settings['session_timeout'] ?? '60'}
                      onChange={(e) => setSettings((p) => ({ ...p, session_timeout: e.target.value }))}
                    />
                  </div>
                  <button onClick={() => handleSaveSetting('session_timeout', settings['session_timeout'] ?? '60')} className="btn-primary" disabled={saving}>
                    {saving ? 'ذخیره...' : 'ذخیره'}
                  </button>
                </div>
              )}

              {activeSection === 'employees' && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">مدیریت کارکنان از صفحه «کارکنان» قابل انجام است.</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">تعداد کارکنان</span>
                    <span className="text-sm font-medium text-neutral-900">{employeeCount}</span>
                  </div>
                </div>
              )}

              {activeSection === 'access' && (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-500">نقش‌ها و دسترسی‌ها از صفحه «امنیت و فعالیت‌ها» قابل مشاهده هستند.</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">تعداد نقش‌ها</span>
                    <span className="text-sm font-medium text-neutral-900">{roleCount}</span>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div>
                  <label className="label">حالت تم</label>
                  <div className="flex gap-3">
                    {['light', 'dark', 'auto'].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleSaveSetting('theme', t)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors',
                          (settings['theme'] ?? 'light') === t
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
                        )}
                      >
                        {t === 'light' ? 'روشن' : t === 'dark' ? 'تیره' : 'خودکار'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'language' && (
                <div>
                  <label className="label">زبان رابط کاربری</label>
                  <select
                    className="input"
                    value={settings['language'] ?? 'fa'}
                    onChange={(e) => handleSaveSetting('language', e.target.value)}
                  >
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>
              )}

              {activeSection === 'datetime' && (
                <div>
                  <label className="label">قالب تاریخ</label>
                  <select
                    className="input"
                    value={settings['date_format'] ?? 'jalali'}
                    onChange={(e) => handleSaveSetting('date_format', e.target.value)}
                  >
                    <option value="jalali">شمسی (جلالی)</option>
                    <option value="gregorian">میلادی</option>
                  </select>
                </div>
              )}

              {activeSection === 'storage' && (
                <div className="space-y-3">
                  <div>
                    <label className="label">حداکثر حجم فایل (MB)</label>
                    <input
                      type="number"
                      className="input"
                      value={settings['max_upload_mb'] ?? '10'}
                      onChange={(e) => setSettings((p) => ({ ...p, max_upload_mb: e.target.value }))}
                    />
                  </div>
                  <button onClick={() => handleSaveSetting('max_upload_mb', settings['max_upload_mb'] ?? '10')} className="btn-primary" disabled={saving}>
                    {saving ? 'ذخیره...' : 'ذخیره'}
                  </button>
                </div>
              )}

              {activeSection === 'system' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">نسخه سیستم</span>
                    <span className="text-sm font-medium text-neutral-900">۰.۱.۰</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">پایگاه داده</span>
                    <span className="text-sm font-medium text-success-600">متصل</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                    <span className="text-sm text-neutral-600">بلادرنگ</span>
                    <span className="text-sm font-medium text-success-600">فعال</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
