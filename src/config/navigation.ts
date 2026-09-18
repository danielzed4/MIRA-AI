import {
  LayoutDashboard,
  Inbox,
  Users,
  Target,
  Phone,
  Building2,
  FileText,
  Megaphone,
  Bot,
  BookOpen,
  UserCog,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: string
}

export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    id: 'main',
    title: 'اصلی',
    items: [
      { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard, path: '/' },
      { id: 'inbox', label: 'صندوق ورودی', icon: Inbox, path: '/inbox' },
      { id: 'customers', label: 'مشتریان', icon: Users, path: '/customers' },
      { id: 'leads', label: 'سرنخ‌ها', icon: Target, path: '/leads' },
    ],
  },
  {
    id: 'accounts',
    title: 'حساب‌ها و خدمات',
    items: [
      { id: 'phone-numbers', label: 'شماره‌ها و حساب‌ها', icon: Phone, path: '/phone-numbers' },
      { id: 'services', label: 'خدمات شرکت', icon: Building2, path: '/services' },
    ],
  },
  {
    id: 'content',
    title: 'محتوا و ارتباطات',
    items: [
      { id: 'content', label: 'مدیریت محتوا', icon: FileText, path: '/content' },
      { id: 'campaigns', label: 'کمپین‌ها', icon: Megaphone, path: '/campaigns' },
    ],
  },
  {
    id: 'intelligence',
    title: 'هوش مصنوعی',
    items: [
      { id: 'ai', label: 'دستیار هوشمند', icon: Bot, path: '/ai' },
      { id: 'knowledge-base', label: 'پایگاه دانش', icon: BookOpen, path: '/knowledge-base' },
    ],
  },
  {
    id: 'management',
    title: 'مدیریت',
    items: [
      { id: 'employees', label: 'کارکنان', icon: UserCog, path: '/employees' },
      { id: 'reports', label: 'گزارش‌ها', icon: BarChart3, path: '/reports' },
      { id: 'notifications', label: 'اعلان‌ها', icon: Bell, path: '/notifications' },
    ],
  },
  {
    id: 'system',
    title: 'سیستم',
    items: [
      { id: 'settings', label: 'تنظیمات', icon: Settings, path: '/settings' },
      { id: 'security', label: 'امنیت و فعالیت‌ها', icon: ShieldCheck, path: '/security' },
    ],
  },
]

export function buildServiceNavItems(services: { id: string; name: string; slug: string; icon: string }[]): NavSection[] {
  if (services.length === 0) return navSections
  const serviceItems: NavItem[] = services.map((s) => ({
    id: `service-${s.slug}`,
    label: s.name,
    icon: Building2,
    path: `/services/${s.slug}`,
  }))
  const serviceSection: NavSection = { id: 'services', title: 'خدمات', items: serviceItems }
  const accountsIdx = navSections.findIndex((sec) => sec.id === 'accounts')
  return [
    ...navSections.slice(0, accountsIdx + 1),
    serviceSection,
    ...navSections.slice(accountsIdx + 1),
  ]
}
