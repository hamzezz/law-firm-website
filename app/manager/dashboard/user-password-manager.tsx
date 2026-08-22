'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function ChangeRow({ account }: { account: any }) {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChange() {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const sessionResult = await supabase.auth.getSession()
      const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''

      const res = await fetch('/api/manager/change-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ targetUserId: account.id, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل تغيير كلمة المرور' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
      setNewPassword('')
      setTimeout(() => { setOpen(false); setMessage(null) }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 flex-wrap gap-2">
      <div>
        <p className="font-bold text-slate-800 text-sm">{account.full_name}</p>
        <p className="text-xs text-slate-400">@{account.username} - {account.role === 'lawyer' ? 'محامي' : account.role === 'manager' ? 'مدير' : 'موكل'}</p>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-bold">
          تغيير كلمة المرور
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="كلمة مرور جديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 flex-1"
          />
          <button onClick={handleChange} disabled={loading} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition font-bold disabled:opacity-50">
            {loading ? '...' : 'حفظ'}
          </button>
          <button onClick={() => { setOpen(false); setMessage(null) }} className="text-xs text-slate-400 hover:text-slate-600">إلغاء</button>
        </div>
      )}

      {message && (
        <div className={'w-full text-xs p-2 rounded-lg ' + (message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message.text}
        </div>
      )}
    </div>
  )
}

export default function UserPasswordManager({ accounts }: { accounts: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
      <h3 className="font-bold text-slate-900 mb-3">إدارة كلمات مرور الحسابات</h3>
      {(!accounts || accounts.length === 0) && (
        <p className="text-slate-400 text-sm text-center py-4">لا توجد حسابات.</p>
      )}
      <div>
        {accounts ? accounts.map((a: any) => <ChangeRow key={a.id} account={a} />) : null}
      </div>
    </div>
  )
}
