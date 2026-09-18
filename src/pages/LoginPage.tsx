import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { Building2, Mail, Lock, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) setError(signInError)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-primary-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">مرکز مدیریت شرکت</h1>
          <p className="text-sm text-neutral-500 mt-1">پلتفرم یکپارچه مدیریت کسب و کار</p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-6">ورود به سیستم</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">ایمیل</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="input pr-10"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="label">رمز عبور</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          © ۱۴۰۵ مرکز مدیریت شرکت — تمام حقوق محفوظ است
        </p>
      </div>
    </div>
  )
}
