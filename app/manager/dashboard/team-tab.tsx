'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  let pass = ''
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)]
  }
  return pass
}

function AddLawyerForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/manager/create-lawyer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ fullName, specialization, username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء إنشاء المحامي' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: `تم إنشاء المحامي بنجاح — اسم المستخدم: ${data.username}` })
      setFullName('')
      setSpecialization('')
      setUsername('')
      setPassword('')
      onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم' })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-900 mb-2">إضافة محامي جديد</h3>

      {message && (
        <div
          className={`text-sm p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="اسم المحامي"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
        <input
          type="text"
          placeholder="التخصص"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
        />
        <input
          type="text"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
          required
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="px-3 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 text-sm"
            title="توليد كلمة مرور"
          >
            🎲
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
      >
        {loading ? 'جارٍ الحفظ...' : 'حفظ المحامي'}
      </button>
    </form>
  )
}

export default function TeamTab({ allLawyers, cases, onRefresh }: any) {
  const lawyerCaseCounts = (allLawyers || []).map((l: any) => {
    const count = (cases || []).filter((c: any) => c.lawyers?.id === l.id).length
    return { ...l, caseCount: count }
  })

  return (
    <div className="space-y-6">
      <AddLawyerForm onSuccess={onRefresh} />

      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <h3 className="font-bold text-slate-900 p-4 border-b border-slate-100">قائمة المحامين</h3>
        {(!lawyerCaseCounts || lawyerCaseCounts.length === 0) && (
          <p className="p-6 text-center text-slate-400 text-sm">لا يوجد محامون مسجّلون بعد.</p>
        )}
        <div className="divide-y divide-slate-100">
          {lawyerCaseCounts.map((l: any) => (
            <div key={l.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">{l.users?.full_name}</p>
                {l.specialization && <p className="text-slate-400 text-xs mt-1">{l.specialization}</p>}
              </div>
              <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                {l.caseCount} قضية
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
