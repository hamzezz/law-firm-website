'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function DeleteRow({ account }: { account: any }) {
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [impact, setImpact] = useState<any>(null)

  async function loadImpact() {
    const supabase = createClient()

    if (account.role === 'client') {
      const { data: clientRow } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', account.id)
        .maybeSingle()

      if (clientRow) {
        const { count: caseCount } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientRow.id)
        setImpact({ cases: caseCount || 0 })
        return
      }
    }

    if (account.role === 'lawyer') {
      const { data: lawyerRow } = await supabase
        .from('lawyers')
        .select('id')
        .eq('user_id', account.id)
        .maybeSingle()

      if (lawyerRow) {
        const { count: caseCount } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('primary_lawyer_id', lawyerRow.id)
        setImpact({ cases: caseCount || 0 })
        return
      }
    }

    setImpact({ cases: 0 })
  }

  async function handleOpen() {
    setOpen(true)
    setMessage('')
    setConfirmName('')
    await loadImpact()
  }

  async function handleDelete() {
    setLoading(true)
    setMessage('')

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
        setMessage(data.error || 'فشل الحذف')
        setLoading(false)
        return
      }

      window.location.reload()
    } catch (err) {
      setMessage('حدث خطأ أثناء الحذف')
      setLoading(false)
    }
  }

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-bold text-slate-800 text-sm">{account.full_name}</p>
          <p className="text-[11px] text-slate-400">
            @{account.username} — {account.role === 'lawyer' ? 'محامي' : 'موكل'}
          </p>
        </div>

        {!open && (
          <button
            onClick={handleOpen}
            className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-bold"
          >
            حذف نهائي
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-red-800">⚠️ تحذير: حذف نهائي لا يمكن التراجع عنه</p>

          {impact !== null && (
            <p className="text-[11px] text-red-700 leading-relaxed">
              سيتم حذف الحساب نهائياً
              {impact.cases > 0 && (
                <> مع <strong>{impact.cases}</strong> قضية مرتبطة به، وكل جلساتها ومحاضرها ومواعيدها الحرجة</>
              )}
              {impact.cases === 0 && <> (لا توجد قضايا مرتبطة به)</>}.
            </p>
          )}

          <p className="text-[11px] text-red-700">
            يُنصح بشدة بتنزيل نسخة احتياطية قبل المتابعة.
          </p>

          <div>
            <label className="text-[11px] text-red-800 block mb-1">
              للتأكيد، اكتب اسم الحساب بالضبط: <strong>{account.full_name}</strong>
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-400"
              placeholder="اكتب الاسم هنا"
            />
          </div>

          {message && <p className="text-[11px] text-red-700 bg-red-100 p-2 rounded-lg">{message}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading || confirmName.trim() !== account.full_name.trim()}
              className="flex-1 bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition text-xs"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeleteAccountPanel({ accounts }: { accounts: any[] }) {
  const deletable = (accounts || []).filter((a: any) => a.role !== 'manager')

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      <h3 className="font-bold text-slate-900 text-sm mb-1">حذف الحسابات</h3>
      <p className="text-[11px] text-slate-400 mb-3">
        حذف نهائي للموكلين والمحامين. حسابات المدراء محمية ولا تظهر هنا.
      </p>

      {deletable.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">لا توجد حسابات قابلة للحذف.</p>
      )}

      <div>
        {deletable.map((a: any) => (
          <DeleteRow key={a.id} account={a} />
        ))}
      </div>
    </div>
  )
}
