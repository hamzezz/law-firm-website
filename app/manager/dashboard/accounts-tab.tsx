'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function normalizeForCompare(text: string): string {
  return (text || '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function roleLabel(role: string) {
  if (role === 'lawyer') return 'محامي'
  if (role === 'manager') return 'مدير'
  return 'موكل'
}

function roleBadge(role: string) {
  if (role === 'lawyer') return 'bg-emerald-50 text-emerald-700'
  if (role === 'manager') return 'bg-amber-50 text-amber-700'
  return 'bg-blue-50 text-blue-700'
}

function AccountRow({ account, isTech }: { account: any; isTech: boolean }) {
  const [mode, setMode] = useState<'idle' | 'password' | 'delete'>('idle')
  const [newPassword, setNewPassword] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [impact, setImpact] = useState<any>(null)

  async function loadImpact() {
    const supabase = createClient()
    const table = account.role === 'client' ? 'clients' : 'lawyers'
    const { data: row } = await supabase.from(table).select('id').eq('user_id', account.id).maybeSingle()

    if (!row) {
      setImpact({ cases: 0 })
      return
    }

    const column = account.role === 'client' ? 'client_id' : 'primary_lawyer_id'
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq(column, row.id)
    setImpact({ cases: count || 0 })
  }

  async function handlePasswordChange() {
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
        setMessage({ type: 'error', text: data.error || 'فشل التغيير' })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' })
      setNewPassword('')
      setTimeout(() => { setMode('idle'); setMessage(null) }, 1500)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ في الاتصال' })
    }
    setLoading(false)
  }

  async function handleDelete() {
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const sessionResult = await supabase.auth.getSession()
      const token = sessionResult.data.session ? sessionResult.data.session.access_token : ''

      const res = await fetch('/api/manager/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ targetUserId: account.id, confirmName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'فشل الحذف' })
        setLoading(false)
        return
      }

      window.location.reload()
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' })
      setLoading(false)
    }
  }

  const canDelete = isTech && account.role !== 'manager'

  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm">
            {account.role === 'lawyer' ? '⚖️' : account.role === 'manager' ? '🏛️' : '👤'}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{account.full_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400">@{account.username}</span>
              <span className={'text-[9px] px-2 py-0.5 rounded-full font-bold ' + roleBadge(account.role)}>
                {roleLabel(account.role)}
              </span>
            </div>
          </div>
        </div>

        {mode === 'idle' && (
          <div className="flex gap-2">
            <button
              onClick={() => { setMode('password'); setMessage(null); setNewPassword('') }}
              className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition font-bold"
            >
              🔑 كلمة المرور
            </button>
            {canDelete && (
              <button
                onClick={async () => { setMode('delete'); setMessage(null); setConfirmName(''); await loadImpact() }}
                className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-bold"
              >
                🗑 حذف
              </button>
            )}
          </div>
        )}
      </div>

      {mode === 'password' && (
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700">تغيير كلمة مرور {account.full_name}</p>

          {message && (
            <div className={'text-[11px] p-2 rounded-lg ' + (message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {message.text}
            </div>
          )}

          <input
            type="text"
            placeholder="كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-400"
          />

          <div className="flex gap-2">
            <button
              onClick={handlePasswordChange}
              disabled={loading}
              className="flex-1 bg-amber-500 text-white font-bold py-2 rounded-lg hover:bg-amber-600 transition text-xs disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
            </button>
            <button onClick={() => setMode('idle')} className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-xs">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {mode === 'delete' && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-red-800">⚠️ حذف نهائي لا يمكن التراجع عنه</p>

          {impact !== null && (
            <p className="text-[11px] text-red-700 leading-relaxed">
              {account.role === 'client' ? (
                impact.cases > 0 ? (
                  <>سيتم حذف الحساب مع <strong>{impact.cases}</strong> قضية وكل جلساتها ومحاضرها نهائياً.</>
                ) : (
                  <>سيتم حذف الحساب (لا توجد قضايا مرتبطة).</>
                )
              ) : (
                impact.cases > 0 ? (
                  <>سيتم حذف حساب المحامي، و<strong>{impact.cases}</strong> قضية ستتحول تلقائياً إلى "غير مخصصة" (لن تُحذف).</>
                ) : (
                  <>سيتم حذف حساب المحامي (لا توجد قضايا مخصصة له).</>
                )
              )}
            </p>
          )}

          <p className="text-[10px] text-red-600">يُنصح بتنزيل نسخة احتياطية قبل المتابعة.</p>

          <div>
            <label className="text-[11px] text-red-800 block mb-1">
              اكتب اسم الحساب للتأكيد: <strong>{account.full_name}</strong>
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400"
              placeholder="اكتب الاسم هنا"
            />
          </div>

          {message && <p className="text-[11px] text-red-700 bg-red-100 p-2 rounded-lg">{message.text}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading || normalizeForCompare(confirmName) !== normalizeForCompare(account.full_name)}
              className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
            </button>
            <button onClick={() => setMode('idle')} className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition text-xs">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccountsTab({ accounts, isTech }: { accounts: any[]; isTech: boolean }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = (accounts || []).filter((a: any) => {
    if (roleFilter !== 'all' && a.role !== roleFilter) return false
    if (search.trim()) {
      const q = normalizeForCompare(search)
      return (
        normalizeForCompare(a.full_name).includes(q) ||
        (a.username || '').toLowerCase().includes(search.trim().toLowerCase())
      )
    }
    return true
  })

  const counts = {
    all: (accounts || []).length,
    lawyer: (accounts || []).filter((a: any) => a.role === 'lawyer').length,
    client: (accounts || []).filter((a: any) => a.role === 'client').length,
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-sm mb-1">إدارة الحسابات</h3>
        <p className="text-[11px] text-slate-400 mb-4">
          {isTech
            ? 'تغيير كلمات المرور وحذف الحسابات. حسابات المدراء لا يمكن حذفها.'
            : 'تغيير كلمات مرور المحامين والموكلين.'}
        </p>

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="ابحث بالاسم أو اسم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">الكل ({counts.all})</option>
            <option value="lawyer">المحامون ({counts.lawyer})</option>
            <option value="client">الموكلون ({counts.client})</option>
          </select>
        </div>
      </div>

      <div className="px-5">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">لا توجد حسابات مطابقة.</p>
        )}
        {filtered.map((a: any) => (
          <AccountRow key={a.id} account={a} isTech={isTech} />
        ))}
      </div>
    </div>
  )
}
