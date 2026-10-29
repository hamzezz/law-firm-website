'use client'

import { useState } from 'react'

/**
 * إنشاء حساب الطبّاع.
 *
 * كلمة المرور تُعرض مرّة واحدة بعد الإنشاء ثم لا تُسترجع، فيُسلّمها
 * المدير لصاحبها. وهذا مقصود: لا نخزّن كلمات المرور ولا نرسلها.
 */
export default function AddTypist({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ username: string; password: string } | null>(null)

  const inputCls =
    'w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none ' +
    'focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400 focus:bg-white transition'

  function suggestPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let out = ''
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length]
    setPassword(out)
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/manager/create-typist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'تعذّر إنشاء الحساب')
      } else {
        setDone({ username: data.username, password })
        setFullName(''); setPhone(''); setUsername(''); setPassword('')
        if (onSuccess) onSuccess()
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setSaving(false)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5">
        <h3 className="font-display font-bold text-slate-900 text-sm">أُنشئ حساب الطبّاع</h3>
        <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
          سلّم هذه البيانات لصاحبها الآن — كلمة المرور لا تُعرض مرّة أخرى.
        </p>

        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2" dir="ltr">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-slate-800 select-all">{done.username}</span>
            <span className="text-[11px] text-slate-400">اسم المستخدم</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-slate-800 select-all">{done.password}</span>
            <span className="text-[11px] text-slate-400">كلمة المرور</span>
          </div>
        </div>

        <button
          onClick={() => { setDone(null); setOpen(false) }}
          className="mt-4 text-xs font-bold bg-slate-800 text-white px-5 py-2 rounded-xl"
        >
          تم
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-slate-900 text-sm">حساب الطبّاع</h3>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            يرى طلبات الطباعة المسندة إليه وأوراقها، ولا يرى الموكّلين ولا بقية القضايا.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-xl"
        >
          {open ? 'إخفاء' : 'إضافة طبّاع'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">الاسم الكامل</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">الهاتف (اختياري)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} dir="ltr" />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">اسم المستخدم — لاتيني بلا مسافات</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              dir="ltr"
              placeholder="typist"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1">كلمة المرور — ثمانية أحرف فأكثر</label>
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                dir="ltr"
              />
              <button
                onClick={suggestPassword}
                type="button"
                className="shrink-0 text-xs font-bold bg-slate-100 text-slate-700 px-4 rounded-xl hover:bg-slate-200 transition"
              >
                توليد
              </button>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !fullName.trim() || !username.trim() || password.length < 8}
            className="text-xs font-bold bg-amber-600 text-white px-5 py-2.5 rounded-xl disabled:opacity-50"
          >
            {saving ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </div>
      )}
    </div>
  )
}
