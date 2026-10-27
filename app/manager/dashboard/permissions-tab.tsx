'use client'

import { useState } from 'react'
import { matchesArabic } from '@/lib/text/arabic'

/**
 * من يطّلع على القضية.
 *
 * كانت الأداة السابقة تُظهر النجاح ولا تحفظ: مفتاح «الجميع» يكتب null على
 * null فلا يُقيَّد شيء، ومنح المحامي يتبدّل على الشاشة بلا تحقّق من الخطأ.
 * فصار كلّ تغيير يمرّ على /api/manager/case-access، ولا تتبدّل الشاشة إلا
 * بعد أن يؤكّد الخادم الحفظ فعلاً.
 *
 * نموذج الصلاحية:
 *  - «متاحة لجميع المحامين»  = primary_lawyer_id فارغ.
 *  - «محامون محدَّدون»        = محامٍ مسؤول + من مُنح صلاحية الاطلاع.
 */

type Mode = 'all' | 'restricted'

function lawyerFullName(l: any): string {
  const u = Array.isArray(l?.users) ? l.users[0] : l?.users
  return u?.full_name || 'محامٍ'
}

function clientFullName(c: any): string {
  const cl = Array.isArray(c?.clients) ? c.clients[0] : c?.clients
  const u = Array.isArray(cl?.users) ? cl.users[0] : cl?.users
  return u?.full_name || ''
}

export default function PermissionsTab({ cases, allLawyers }: any) {
  const lawyers: any[] = allLawyers || []

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  /** حالة القضية المفتوحة */
  const [mode, setMode] = useState<Mode>('all')
  const [primaryId, setPrimaryId] = useState<string>('')
  const [granted, setGranted] = useState<string[]>([])

  const [loadingCase, setLoadingCase] = useState(false)
  const [busy, setBusy] = useState<string>('')      // معرّف العنصر الجاري حفظه
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  /**
   * التغييرات المحفوظة في هذه الجلسة، كي تعرض القائمة الحالة الصحيحة
   * دون إعادة تحميل الصفحة.
   */
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})

  function currentPrimary(c: any): string | null {
    if (Object.prototype.hasOwnProperty.call(overrides, c.id)) return overrides[c.id]
    const l = Array.isArray(c.lawyers) ? c.lawyers[0] : c.lawyers
    return l?.id || null
  }

  const filtered: any[] = (cases || []).filter((c: any) => {
    const q = search.trim()
    if (!q) return true
    const haystack = [
      c.case_number,
      c.title,
      c.court_name,
      c.case_type,
      c.other_party,
      clientFullName(c),
    ]
      .filter(Boolean)
      .join(' ')
    return matchesArabic(haystack, q)
  })

  const shown = filtered.slice(0, 60)

  async function openCase(c: any) {
    setSelected(c)
    setError('')
    setSaved('')
    setLoadingCase(true)
    setGranted([])

    const fallbackPrimary = currentPrimary(c)
    setMode(fallbackPrimary ? 'restricted' : 'all')
    setPrimaryId(fallbackPrimary || '')

    try {
      const res = await fetch('/api/manager/case-access?caseId=' + encodeURIComponent(c.id))
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'تعذّر قراءة صلاحيات هذه القضية')
      } else {
        setMode(data.primaryLawyerId ? 'restricted' : 'all')
        setPrimaryId(data.primaryLawyerId || '')
        setGranted(data.granted || [])
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقّق من الشبكة وأعد المحاولة.')
    }
    setLoadingCase(false)
  }

  async function send(payload: any): Promise<any | null> {
    setError('')
    setSaved('')
    try {
      const res = await fetch('/api/manager/case-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, caseId: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'تعذّر الحفظ')
        return null
      }
      return data
    } catch {
      setError('تعذّر الاتصال بالخادم. لم يُحفظ التغيير.')
      return null
    }
  }

  /** إتاحة القضية لجميع المحامين */
  async function chooseAll() {
    if (!selected || mode === 'all') return
    setBusy('mode')
    const data = await send({ action: 'open_to_all' })
    if (data) {
      setMode('all')
      setPrimaryId('')
      setOverrides((p) => ({ ...p, [selected.id]: null }))
      setSaved('أصبحت القضية متاحة لجميع المحامين')
    }
    setBusy('')
  }

  /**
   * الانتقال إلى «محامون محدَّدون».
   * لا يُكتب شيء قبل اختيار المسؤول، لأن قصر القضية بلا مسؤول
   * يعني حجبها عن الجميع.
   */
  function chooseRestricted() {
    if (!selected || mode === 'restricted') return
    setError('')
    setSaved('')
    setMode('restricted')
    setPrimaryId('')
  }

  async function savePrimary(lawyerId: string) {
    if (!selected || !lawyerId) return
    setBusy('mode')
    const data = await send({ action: 'restrict', primaryLawyerId: lawyerId })
    if (data) {
      setPrimaryId(lawyerId)
      setGranted((p) => p.filter((id) => id !== lawyerId))
      setOverrides((p) => ({ ...p, [selected.id]: lawyerId }))
      setSaved('القضية الآن مقصورة على ' + lawyerFullName(lawyers.find((l) => l.id === lawyerId)) + ' ومن تمنحه الاطلاع')
    }
    setBusy('')
  }

  async function toggleLawyer(lawyerId: string) {
    if (!selected) return
    const has = granted.indexOf(lawyerId) !== -1
    setBusy(lawyerId)
    const data = await send({ action: has ? 'revoke' : 'grant', lawyerId })
    if (data) {
      setGranted((p) => (has ? p.filter((id) => id !== lawyerId) : [...p, lawyerId]))
      setSaved(
        has
          ? 'سُحبت صلاحية الاطلاع من ' + lawyerFullName(lawyers.find((l) => l.id === lawyerId))
          : 'مُنح ' + lawyerFullName(lawyers.find((l) => l.id === lawyerId)) + ' صلاحية الاطلاع'
      )
    }
    setBusy('')
  }

  const viewerCount = granted.length + (primaryId ? 1 : 0)

  // ═══════════════════════════ القائمة ═══════════════════════════
  if (!selected) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6">
          <h3 className="font-display font-bold text-slate-900 text-base">صلاحيات الاطلاع على القضايا</h3>
          <p className="text-slate-500 text-[13px] mt-1.5 leading-relaxed">
            اختر قضيةً لتحديد من يطّلع عليها من المحامين. والقضية إمّا متاحة للجميع،
            وإمّا مقصورة على محامٍ مسؤول ومن تمنحه الاطلاع.
          </p>

          <div className="relative mt-4">
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="ابحث برقم القضية أو عنوانها أو اسم الموكّل أو المحكمة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-500">
              {search.trim() ? 'نتائج البحث' : 'جميع القضايا'}
            </span>
            <span className="text-[12px] text-slate-400">{filtered.length}</span>
          </div>

          {filtered.length === 0 && (
            <p className="text-slate-400 text-sm py-10 text-center">لا توجد قضايا مطابقة.</p>
          )}

          <div className="divide-y divide-slate-100">
            {shown.map((c: any) => {
              const p = currentPrimary(c)
              const primaryName = p
                ? lawyerFullName(lawyers.find((l) => l.id === p)) || ''
                : ''
              return (
                <button
                  key={c.id}
                  onClick={() => openCase(c)}
                  className="w-full text-right px-5 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.title}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      {c.case_number}
                      {clientFullName(c) ? ' — ' + clientFullName(c) : ''}
                    </p>
                  </div>

                  <span
                    className={
                      'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ' +
                      (p ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')
                    }
                  >
                    {p ? 'محامون محدَّدون' : 'الجميع'}
                  </span>

                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 w-4 h-4 text-slate-300"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
              )
            })}
          </div>

          {filtered.length > shown.length && (
            <p className="px-5 py-3 text-[12px] text-slate-400 border-t border-slate-100">
              تُعرض {shown.length} من {filtered.length} — استخدم البحث للوصول إلى البقية.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════ القضية المفتوحة ═══════════════════════════
  const others = lawyers.filter((l) => l.id !== primaryId)

  return (
    <div className="space-y-4">
      {/* رأس القضية */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6">
        <button
          onClick={() => { setSelected(null); setError(''); setSaved('') }}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 6l6 6-6 6" />
          </svg>
          رجوع لقائمة القضايا
        </button>

        <h3 className="font-display font-bold text-slate-900 text-base leading-snug">{selected.title}</h3>
        <p className="text-[12px] text-slate-500 mt-1">
          {selected.case_number}
          {clientFullName(selected) ? ' — ' + clientFullName(selected) : ''}
          {selected.court_name ? ' — ' + selected.court_name : ''}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3 leading-relaxed">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] rounded-xl px-4 py-3">
          {saved}
        </div>
      )}

      {loadingCase ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-10 text-center">
          <p className="text-slate-400 text-sm">جارٍ قراءة الصلاحيات...</p>
        </div>
      ) : (
        <>
          {/* الاختيار بين الحالتين */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6">
            <h4 className="font-bold text-slate-800 text-sm mb-3">من يطّلع على هذه القضية؟</h4>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={chooseAll}
                disabled={busy === 'mode'}
                className={
                  'text-right p-4 rounded-xl border-2 transition disabled:opacity-60 ' +
                  (mode === 'all'
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-200 hover:border-slate-300 bg-white')
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'w-4 h-4 rounded-full border-2 shrink-0 ' +
                      (mode === 'all' ? 'border-emerald-600 bg-emerald-600 ring-2 ring-inset ring-white' : 'border-slate-300')
                    }
                  />
                  <span className="text-sm font-bold text-slate-800">جميع المحامين</span>
                </div>
                <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                  تظهر القضية في لوحة كلّ محامٍ في المكتب.
                </p>
              </button>

              <button
                onClick={chooseRestricted}
                disabled={busy === 'mode'}
                className={
                  'text-right p-4 rounded-xl border-2 transition disabled:opacity-60 ' +
                  (mode === 'restricted'
                    ? 'border-amber-500 bg-amber-50/60'
                    : 'border-slate-200 hover:border-slate-300 bg-white')
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'w-4 h-4 rounded-full border-2 shrink-0 ' +
                      (mode === 'restricted' ? 'border-amber-600 bg-amber-600 ring-2 ring-inset ring-white' : 'border-slate-300')
                    }
                  />
                  <span className="text-sm font-bold text-slate-800">محامون محدَّدون</span>
                </div>
                <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                  محامٍ مسؤول، ومن تمنحه صلاحية الاطلاع وحده.
                </p>
              </button>
            </div>

            {busy === 'mode' && <p className="text-[12px] text-slate-400 mt-3">جارٍ الحفظ...</p>}
          </div>

          {/* المحامي المسؤول ومن يُمنح الاطلاع */}
          {mode === 'restricted' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">المحامي المسؤول</label>
                <p className="text-[12px] text-slate-500 mb-2.5 leading-relaxed">
                  صاحب القضية، ويطّلع عليها دائماً.
                </p>
                <select
                  value={primaryId}
                  onChange={(e) => savePrimary(e.target.value)}
                  disabled={busy === 'mode'}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400 focus:bg-white transition disabled:opacity-60"
                >
                  <option value="">— اختر المحامي المسؤول —</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>{lawyerFullName(l)}</option>
                  ))}
                </select>

                {!primaryId && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2.5 leading-relaxed">
                    لم يُحفظ شيء بعد. اختر المحامي المسؤول ليصير القصر سارياً.
                  </p>
                )}
              </div>

              {primaryId && (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1.5">محامون آخرون يطّلعون على القضية</h4>
                  <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
                    افتح المفتاح أمام من تريد أن يطّلع عليها معه. وكلّ منحٍ أو سحبٍ يُقيَّد في سجلّ التدقيق.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {others.length === 0 && (
                      <p className="text-slate-400 text-[13px] py-6 text-center">لا يوجد محامون آخرون.</p>
                    )}

                    {others.map((l) => {
                      const on = granted.indexOf(l.id) !== -1
                      const working = busy === l.id
                      return (
                        <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <span className="text-sm text-slate-700 min-w-0 truncate">{lawyerFullName(l)}</span>
                          <button
                            onClick={() => toggleLawyer(l.id)}
                            disabled={working || busy !== ''}
                            aria-label={(on ? 'سحب صلاحية الاطلاع من ' : 'منح صلاحية الاطلاع لـ') + lawyerFullName(l)}
                            className={
                              'relative shrink-0 w-12 h-7 rounded-full transition disabled:opacity-50 ' +
                              (on ? 'bg-emerald-500' : 'bg-slate-300')
                            }
                          >
                            <span
                              className={
                                'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ' +
                                (on ? 'right-1' : 'right-6')
                              }
                            />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* خلاصة الحالة */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
            <p className="text-[13px] text-slate-600 leading-relaxed">
              {mode === 'all'
                ? 'هذه القضية متاحة لجميع المحامين.'
                : primaryId
                ? 'يطّلع على هذه القضية ' + viewerCount + ' من المحامين: ' +
                  [lawyerFullName(lawyers.find((l) => l.id === primaryId))]
                    .concat(granted.map((id) => lawyerFullName(lawyers.find((l) => l.id === id))))
                    .join(' · ')
                : 'لم يُحدَّد المحامي المسؤول بعد، والقضية لا تزال على حالتها السابقة.'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
