'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ClientLoginPage() {
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
    const syntheticEmail = `${username.trim().toLowerCase()}@clients.lawfirm.internal`

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: password,
    })

    if (authError || !data.user) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    router.push('/client/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}
      dir="rtl"
    >
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center border-b-4 border-blue-600 flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="شعار المكتب"
            width={64}
            height={64}
            className="rounded-full bg-white p-1"
          />
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">بوابة الموكلين</h2>
            <p className="text-slate-300 text-xs">متابعة سير القضايا والمحاضر</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="اسم المستخدم"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-5 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition disabled:opacity-50"
          >
            {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
