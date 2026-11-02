'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLE_LABEL: Record<string, string> = {
  lawyer: 'محامي',
  manager: 'مدير',
  typist: 'طبّاع',
  client: 'موكل',
}

async function authHeaders() {
  const supabase = createClient()
  const sessionResult = await supabase.auth.getSession()
  const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''
  return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
}

function ChangeRow({ account }: { account: any }) {
  /** null = مغلق، 'password' = تغيير كلمة المرور، 'username' = تغيير الاسم */
  const [mode, setMode] = useState<null | 'password' | 'username'>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  /**
   * الاسم المعروض يُحفظ في الحالة لا يُقرأ من account مباشرة، كي يتحدّث
   * السطر فور نجاح التغيير دون انتظار إعادة تحميل الصفحة.
   */
  const [username, setUsername] = useState(account.username)

  /**
   * حالة التفعيل تُحفظ هنا كذلك ليتحدّث السطر فور الإيقاف.
   * والافتراض `true` لا `false`: صفٌّ لم تُقرأ حالته يُعدّ مفعّلاً،
   * فلا يُوصم حسابٌ سليم بالإيقاف لأن استعلاماً نقص عموداً.
   */
  const [active, setActive] = useState(account.is_active !== false)

  function close() {
    setMode(null)
    setMessage(null)
    setNewPassword('')
    setNewUsername('')
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/manager/change-user-password', {
        method: 'POST',
        headers: await authHeaders(),
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
      setTimeout(() => { close() }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
    }
    setLoading(false)
  }

  async function handleChangeUsername() {
    const value = newUsername.trim().toLowerCase()

    if (value.length < 3) {
      setMessage({ type: 'error', text: 'اسم المستخدم ثلاثة أحرف فأكثر' })
      return
    }
    if (!/^[a-z0-9._-]+$/.test(value)) {
      setMessage({ type: 'error', text: 'حروف لاتينية وأرقام فقط، بلا مسافات' })
      return
    }
    if (value === username) {
      setMessage({ type: 'error', text: 'هذا هو الاسم الحالي' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/manager/change-username', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ targetUserId: account.id, newUsername: value }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل تغيير اسم المستخدم' })
        setLoading(false)
        return
      }

      setUsername(value)
      setMessage({ type: 'success', text: 'تمّ. اسم الدخول الآن: ' + value })
      setTimeout(() => { close() }, 2500)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
    }
    setLoading(false)
  }

  async function handleToggleActive() {
    const next = !active

    if (!next && !confirm('إيقاف دخول «' + account.full_name + '»؟\n\nلن يستطيع الدخول، ويبقى ملفّ قضيّته كما هو. ويمكنك إعادة التفعيل في أي وقت.')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/manager/toggle-active', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ targetUserId: account.id, active: next }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل الإجراء' })
        setLoading(false)
        return
      }

      setActive(next)
      setMessage({
        type: 'success',
        text: next ? 'أُعيد تفعيل الدخول.' : 'أُوقف الدخول. وملفّ القضية باقٍ كما هو.',
      })
      setTimeout(() => { setMessage(null) }, 3000)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 flex-wrap gap-2">
      <div>
        <p className="font-bold text-slate-800 text-sm">
          {account.full_name}
          {!active && (
            <span className="mr-2 align-middle text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
              موقوف
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">@{username} - {ROLE_LABEL[account.role] || account.role}</p>
      </div>

      {mode === null && (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setMode('password')} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-bold">
            تغيير كلمة المرور
          </button>
          <button onClick={() => { setMode('username'); setNewUsername(username) }} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-bold">
            تغيير اسم المستخدم
          </button>
          <button
            onClick={handleToggleActive}
            disabled={loading}
            className={
              'text-xs px-3 py-1.5 rounded-lg transition font-bold disabled:opacity-50 ' +
              (active
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
            }
          >
            {loading ? '...' : active ? 'إيقاف الدخول' : 'إعادة التفعيل'}
          </button>
        </div>
      )}

      {mode === 'password' && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="كلمة مرور جديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 flex-1"
          />
          <button onClick={handleChangePassword} disabled={loading} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition font-bold disabled:opacity-50">
            {loading ? '...' : 'حفظ'}
          </button>
          <button onClick={close} className="text-xs text-slate-400 hover:text-slate-600">إلغاء</button>
        </div>
      )}

      {mode === 'username' && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            dir="ltr"
            placeholder="اسم مستخدم جديد"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 flex-1 text-left"
          />
          <button onClick={handleChangeUsername} disabled={loading} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition font-bold disabled:opacity-50">
            {loading ? '...' : 'حفظ'}
          </button>
          <button onClick={close} className="text-xs text-slate-400 hover:text-slate-600">إلغاء</button>
        </div>
      )}

      {mode === 'username' && !message && (
        <p className="w-full text-[11px] text-slate-400">
          الاسم القديم يتوقّف فور الحفظ، فليجرّب صاحب الحساب الدخول بالاسم الجديد قبل أن يغادر.
        </p>
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
      <h3 className="font-bold text-slate-900 mb-3">إدارة الحسابات</h3>
      {(!accounts || accounts.length === 0) && (
        <p className="text-slate-400 text-sm text-center py-4">لا توجد حسابات.</p>
      )}
      <div>
        {accounts ? accounts.map((a: any) => <ChangeRow key={a.id} account={a} />) : null}
      </div>
    </div>
  )
}
