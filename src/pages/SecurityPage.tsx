import { useEffect, useState } from 'react'
import { ShieldCheck, AlertCircle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuditLogs } from '../api/audit'
import type { AuditLog } from '../types'
import { formatPersianDateTime, cn } from '../lib/utils'

const PAGE_SIZE = 20

export function SecurityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'error'>('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    getAuditLogs(200)
      .then((data) => setLogs(data))
      .catch((e) => setError(e instanceof Error ? e.message : 'خطا در بارگذاری لاگ‌ها'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((log) => {
    if (resultFilter !== 'all' && log.result !== resultFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (log.action?.toLowerCase().includes(q) ?? false) ||
        (log.user_email?.toLowerCase().includes(q) ?? false) ||
        (log.entity_type?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const resultBadge = (result: string) => {
    switch (result) {
      case 'success': return <span className="badge-success">موفق</span>
      case 'error': return <span className="badge-error">خطا</span>
      default: return <span className="badge-neutral">{result}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">امنیت و فعالیت‌ها</h1>
        <p className="text-sm text-neutral-500 mt-1">لاگ امنیتی و ممیزی فعالیت‌های سیستم</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="جستجوی عملیات، کاربر، نوع موجود..."
            className="input pr-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-neutral-400" />
          {[
            { key: 'all' as const, label: 'همه' },
            { key: 'success' as const, label: 'موفق' },
            { key: 'error' as const, label: 'خطا' },
          ].map((f) => (
            <button key={f.key} onClick={() => { setResultFilter(f.key); setPage(0) }}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                resultFilter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="table-header px-4 py-3">کاربر</th>
                    <th className="table-header px-4 py-3">عملیات</th>
                    <th className="table-header px-4 py-3">نوع موجود</th>
                    <th className="table-header px-4 py-3">نتیجه</th>
                    <th className="table-header px-4 py-3">زمان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageData.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="table-cell">
                        <span className="font-medium text-neutral-900">{log.user_email ?? 'سیستم'}</span>
                      </td>
                      <td className="table-cell">{log.action}</td>
                      <td className="table-cell">{log.entity_type ?? '—'}</td>
                      <td className="table-cell">{resultBadge(log.result)}</td>
                      <td className="table-cell text-neutral-500">{formatPersianDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <ShieldCheck size={32} className="mx-auto text-neutral-300 mb-3" />
                        <p className="text-sm text-neutral-500">هنوز فعالیتی ثبت نشده است</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                صفحه {page + 1} از {totalPages} — {filtered.length} رکورد
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="btn-secondary p-2 disabled:opacity-40">
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="btn-secondary p-2 disabled:opacity-40">
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
