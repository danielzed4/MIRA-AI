import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { navSections, buildServiceNavItems, type NavSection } from '../config/navigation'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/auth'
import { LogOut, Building2 } from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const displayName = profile?.display_name ?? 'کاربر'
  const displayRole = profile?.role ?? 'کارمند'
  const initial = displayName.charAt(0)
  const [sections, setSections] = useState<NavSection[]>(navSections)

  useEffect(() => {
    supabase
      .from('services')
      .select('id, name, slug, icon')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSections(buildServiceNavItems(data))
        }
      })
  }, [])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-72 bg-white border-l border-neutral-200 flex flex-col transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-neutral-200 shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-900">مرکز مدیریت شرکت</h1>
            <p className="text-xs text-neutral-500">پلتفرم یکپارچه مدیریت</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="px-3 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn('sidebar-item', isActive && 'sidebar-item-active')
                    }
                    end={item.path === '/'}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="mr-auto badge-primary text-xs">{item.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-neutral-500">{displayRole}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-ghost w-full text-error-600 hover:bg-error-50"
          >
            <LogOut size={16} />
            خروج از حساب
          </button>
        </div>
      </aside>
    </>
  )
}
