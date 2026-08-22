'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'كلمتا المرور غير متطابقتين' })
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ غير متوقع' })
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-slate-300 hover:text-white transition">
        تغيير كلمة المرور
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-slate-900 mb-4">تغيير كلمة المرور</h3>

        {message && (
          <div className={message.type === 'success' ? 'text-sm p-3 rounded-lg mb-3 bg-green-50 text-green-700' : 'text-sm p-3 rounded-lg mb-3 bg-red-50 text-red-700'}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
          <input
            type="text"
            placeholder="تأكيد كلمة المرور"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-amber-500 text-white font-bold py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-sm">
              إغلاق
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
