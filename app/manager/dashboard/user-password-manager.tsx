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
  /** null = مغلق · password = كلمة المرور · username = اسم الدخول · profile = الاسم والهاتف */
  const [mode, setMode] = useState<null | 'password' | 'username' | 'profile'>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  /**
   * الاسم والهاتف يُحفظان في الحالة كذلك ليتحدّث السطر فور الحفظ.
   * ورقم الهاتف يهمّ أكثر ممّا يبدو: بوت واتساب يتعرّف على الموكّل به.
   */
  const [fullName, setFullName] = useState(account.full_name || '')
  const [phone, setPhone] = useState(account.phone || '')
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')

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

  async function handleSaveProfile() {
    const name = draftName.trim()

    if (name.length < 3) {
      setMessage({ type: 'error', text: 'الاسم ثلاثة أحرف فأكثر' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/manager/update-profile', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          targetUserId: account.id,
          fullName: name,
          phone: draftPhone.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل الحفظ' })
        setLoading(false)
        return
      }

      setFullName(data.fullName)
      setPhone(data.phone || '')
      setMessage({ type: 'success', text: 'تمّ حفظ البيانات' })
      setTimeout(() => { close() }, 2000)
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
          {fullName}
          {!active && (
            <span className="mr-2 align-middle text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
              موقوف
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">
          @{username} - {ROLE_LABEL[account.role] || account.role}
          {phone
            ? <span className="tnum"> · {phone}</span>
            : <span className="text-amber-600 font-bold"> · بلا رقم</span>}
        </p>
      </div>

      {mode === null && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setMode('profile'); setDraftName(fullName); setDraftPhone(phone) }}
            className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-bold"
          >
            تعديل الاسم والهاتف
          </button>
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

      {mode === 'profile' && (
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <input
            type="text"
            placeholder="الاسم الكامل"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 flex-1 min-w-[140px]"
          />
          <input
            type="tel"
            dir="ltr"
            inputMode="numeric"
            placeholder="771234567"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 text-left w-36 tnum"
          />
          <button onClick={handleSaveProfile} disabled={loading} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition font-bold disabled:opacity-50">
            {loading ? '...' : 'حفظ'}
          </button>
          <button onClick={close} className="text-xs text-slate-400 hover:text-slate-600">إلغاء</button>
        </div>
      )}

      {mode === 'profile' && !message && (
        <p className="w-full text-[11px] text-slate-400">
          الهاتف تسعة أرقام تبدأ بـ7، بلا مفتاح الدولة. وبه يتعرّف بوت واتساب على الموكّل، فدقّته تعني وصول الخدمة إليه. واتركه فارغاً إن لم يُعرف.
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
