'use client'

import { useState } from 'react'

/**
 * إشعار تجريبي — للمدير التقني.
 * يُترك الحقل فارغاً للإرسال إلى النفس، أو يُكتب اسم مستخدم محامٍ
 * لفحص قناته هو حين يشكو أن الإشعارات لا تصله.
 */
export default function PushTest() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [failed, setFailed] = useState(false)

  async function handleSend() {
    setLoading(true)
    setResult('')
    setFailed(false)
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setFailed(true)
        setResult((data && data.error) || 'تعذّر الإرسال')
      } else {
        setResult('أُرسل إلى ' + data.target + ' — ' + data.message)
      }
    } catch {
      setFailed(true)
      setResult('تعذّر الاتصال بالخادم')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6 space-y-3">
      <div>
        <h3 className="font-display font-bold text-slate-900 text-sm">إشعار تجريبي</h3>
        <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
          لفحص قناة الإشعارات دون إنشاء جلسة. اتركه فارغاً للإرسال إلى نفسك، أو اكتب اسم
          مستخدم محامٍ لفحص قناته.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="اسم المستخدم (اختياري)"
          dir="ltr"
          className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-3 py-2 text-left focus:outline-none focus:border-slate-400"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="shrink-0 text-xs bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition font-bold disabled:opacity-50"
        >
          {loading ? 'جارٍ الإرسال…' : 'إرسال'}
        </button>
      </div>

      {result && (
        <p className={'text-[11px] leading-relaxed ' + (failed ? 'text-red-700' : 'text-emerald-700')}>
          {result}
        </p>
      )}
    </div>
  )
}
