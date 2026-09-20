'use client'

import Link from 'next/link'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function StaffLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const syntheticEmail = `${username.trim().toLowerCase()}@staff.lawfirm.internal`

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: password,
    })

    if (authError || !data.user) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', data.user.id)
      .single()

    if (appUserError || !appUser) {
      setError('لم يتم العثور على حساب موظف مرتبط بهذا المستخدم')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (appUser.role === 'lawyer') {
      router.push('/lawyer/dashboard')
    } else if (appUser.role === 'manager') {
      router.push('/manager/dashboard')
    } else {
      setError('هذا الحساب غير مخوَّل بالدخول إلى بوابة الموظفين')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col lg:flex-row">
      {/* اللوح التعريفي */}
      <div className="relative lg:w-[55%] bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 25% 15%, #f59e0b 0%, transparent 55%)' }} />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-amber-500/30 to-transparent hidden lg:block" />

        <div className="relative h-full flex flex-col justify-between px-8 sm:px-14 py-12 lg:py-16">
          <Link href="/" className="inline-flex items-center gap-3 w-fit group">
            <Image src="/logo.png" alt="شعار المكتب" width={44} height={44} className="rounded-full bg-white p-1" />
            <div>
              <p className="font-display text-white font-bold text-sm leading-tight">مكتب وليد الكثيري</p>
              <p className="text-slate-400 text-[10px] mt-0.5 group-hover:text-amber-300 transition">للمحاماة والاستشارات القانونية</p>
            </div>
          </Link>

          <div className="py-14 lg:py-0">
            <div className="w-10 h-px bg-amber-400/60 mb-7" />
            <h1 className="font-display text-white text-3xl sm:text-4xl font-bold leading-snug">
              بوابة فريق العمل
            </h1>
            <p className="text-slate-400 text-sm leading-loose mt-5 max-w-md">
              إدارة القضايا والجلسات والمواعيد، ومتابعة أعمال المكتب من مكان واحد.
            </p>

            <div className="mt-10 space-y-4 max-w-md">
              {[
                'قضايا اليوم وجلساتها المجدولة',
                'تسجيل قرارات الجلسات ورفع المحاضر',
                'تنبيهات المواعيد الحرجة ومهل الطعن',
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 text-slate-300 text-[13px]">
                  <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-[11px]">© 2026 مكتب وليد الكثيري للمحاماة والاستشارات القانونية</p>
        </div>
      </div>

      {/* لوح الدخول */}
      <div className="lg:w-[45%] bg-white flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 text-center">
            <Image src="/logo.png" alt="شعار المكتب" width={52} height={52} className="rounded-full bg-slate-50 p-1 mx-auto" />
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900">تسجيل الدخول</h2>
          <p className="text-slate-400 text-[13px] mt-2">هذه البوابة مخصصة لأعضاء فريق المكتب.</p>

          <form onSubmit={handleLogin} className="mt-9 space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-slate-600 mb-2">اسم المستخدم</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-600 mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-[12px] rounded-xl px-4 py-3">
                <span className="mt-px">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold text-sm py-3.5 rounded-xl transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ التحقق...' : 'دخول'}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-[12px]">
              لمشكلات الدخول، راجع إدارة المكتب.
            </p>
            <Link href="/" className="inline-block text-slate-500 text-[12px] font-bold mt-3 hover:text-amber-600 transition">
              العودة إلى الموقع
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}