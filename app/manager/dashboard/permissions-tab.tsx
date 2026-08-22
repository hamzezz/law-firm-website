'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PermissionsTab({ cases, allLawyers }: any) {
  const [search, setSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState<any | null>(null)
  const [allAccess, setAllAccess] = useState(false)
  const [accessList, setAccessList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const results = search.trim()
    ? (cases || []).filter(
        (c: any) =>
          c.case_number?.toLowerCase().includes(search.toLowerCase()) ||
          c.title?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  async function openCase(c: any) {
    setSelectedCase(c)
    setMessage('')
    setAllAccess(!c.lawyers)

    const supabase = createClient()
    const { data } = await supabase
      .from('case_lawyer_access')
      .select('lawyer_id')
      .eq('case_id', c.id)

    setAccessList(data?.map((r: any) => r.lawyer_id) || [])
  }

  async function toggleAllAccess() {
    if (!selectedCase) return
    setLoading(true)
    const supabase = createClient()
    const newValue = !allAccess

    const { error } = await supabase
      .from('cases')
      .update({ primary_lawyer_id: newValue ? null : selectedCase.lawyers?.id || null })
      .eq('id', selectedCase.id)

    if (!error) {
      setAllAccess(newValue)
      setMessage(newValue ? 'أصبحت القضية متاحة لجميع المحامين' : 'تم إلغاء إتاحة القضية للجميع')
    }
    setLoading(false)
  }

  async function toggleLawyerAccess(lawyerId: string) {
    if (!selectedCase) return
    const supabase = createClient()
    const hasAccess = accessList.includes(lawyerId)

    if (hasAccess) {
      await supabase
        .from('case_lawyer_access')
        .delete()
        .eq('case_id', selectedCase.id)
        .eq('lawyer_id', lawyerId)
      setAccessList((prev) => prev.filter((id) => id !== lawyerId))
    } else {
      await supabase
        .from('case_lawyer_access')
        .insert({ case_id: selectedCase.id, lawyer_id: lawyerId, access_level: 'viewer' })
      setAccessList((prev) => [...prev, lawyerId])
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-3">ابحث عن قضية</h3>
        <input
          type="text"
          placeholder="اكتب رقم القضية أو عنوانها..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelectedCase(null)
          }}
          className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 mb-3"
        />

        {results.length > 0 && !selectedCase && (
          <div className="flex flex-wrap gap-2">
            {results.map((c: any) => (
              <button
                key={c.id}
                onClick={() => openCase(c)}
                className="px-4 py-2 bg-slate-100 hover:bg-amber-100 rounded-xl text-sm transition"
              >
                {c.case_number} — {c.title}
              </button>
            ))}
          </div>
        )}

        {search.trim() && results.length === 0 && (
          <p className="text-slate-400 text-sm">لا توجد نتائج مطابقة.</p>
        )}
      </div>

      {selectedCase && (
        <div className="bg-white rounded-2xl shadow p-6 border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">
              صلاحيات: {selectedCase.title} ({selectedCase.case_number})
            </h3>
            <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          {message && <div className="text-sm p-3 rounded-lg bg-green-50 text-green-700">{message}</div>}

          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={allAccess}
              onChange={toggleAllAccess}
              disabled={loading}
              className="w-5 h-5 accent-amber-500"
            />
            <span className="text-sm font-bold text-slate-700">
              السماح لجميع المحامين بالاطلاع على هذه القضية
            </span>
          </label>

          {!allAccess && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                منح/سحب صلاحية اطلاع إضافية فردياً لكل محامٍ (غير المسؤول الرئيسي):
              </p>
              <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden">
                {allLawyers
                  ?.filter((l: any) => l.id !== selectedCase.lawyers?.id)
                  .map((l: any) => (
                    <label
                      key={l.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="text-sm text-slate-700">{l.users?.full_name}</span>
                      <input
                        type="checkbox"
                        checked={accessList.includes(l.id)}
                        onChange={() => toggleLawyerAccess(l.id)}
                        className="w-5 h-5 accent-amber-500"
                      />
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
