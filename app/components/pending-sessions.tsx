'use client'

import Link from 'next/link'

/**
 * تنبيه: جلسات حان موعدها ولم يُسجَّل قرارها.
 *
 * علّته من واقعة حقيقية: جلسة بقيت مجدولةً بلا قرار، فلمّا أُجّلت
 * القضية من موضعٍ آخر صارت «جلسة شبح» تظهر في جلسات الغد بلا جلسة
 * خلفها. والنظام لا يعرف ما جرى في المحكمة إلا من المكتب.
 *
 * والضغط على السطر ينقل إلى بطاقة الجلسة نفسها في صفحة القضية
 * (#session-<id>) حيث يُكتب القرار، لا إلى أعلى الصفحة.
 */

export type PendingSession = {
  sessionId: string
  caseId: string
  caseTitle: string
  caseNumber: string
  dateKey: string
  dateLabel: string
  daysLate: number
}

export default function PendingSessions({
  items,
  basePath,
  accent = 'amber',
}: {
  items: PendingSession[]
  /** '/manager/cases' أو '/lawyer/cases' */
  basePath: string
  accent?: 'amber' | 'emerald'
}) {
  if (!items || items.length === 0) return null

  const ring = accent === 'emerald' ? 'border-emerald-300' : 'border-amber-300'
  const dot = accent === 'emerald' ? 'bg-emerald-600' : 'bg-amber-600'

  return (
    <div className={'bg-white rounded-2xl shadow border ' + ring + ' overflow-hidden mb-4'}>
      <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <p className="text-sm font-bold text-rose-900">
          {items.length === 1
            ? 'جلسة حان موعدها ولم يُسجَّل قرارها'
            : items.length + ' جلسات حان موعدها ولم يُسجَّل قرارها'}
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((s) => (
          <Link
            key={s.sessionId}
            href={basePath + '/' + s.caseId + '#session-' + s.sessionId}
            prefetch={false}
            className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 active:scale-[.995] transition"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{s.caseTitle}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {s.caseNumber ? s.caseNumber + ' — ' : ''}{s.dateLabel}
              </p>
            </div>

            <span className="shrink-0 flex items-center gap-2">
              <span className={
                'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                (s.daysLate >= 3 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')
              }>
                {s.daysLate === 0 ? 'اليوم' : s.daysLate === 1 ? 'منذ يوم' : 'منذ ' + s.daysLate + ' أيام'}
              </span>
              <span className={'w-6 h-6 rounded-full ' + dot + ' text-white flex items-center justify-center'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="px-5 py-2.5 text-[11px] text-slate-500 bg-slate-50 leading-relaxed">
        اضغط الجلسة لتسجيل قرارها. والجلسة التي لا يُسجَّل قرارها تبقى معلّقة وقد تظهر لاحقاً كجلسة لا وجود لها.
      </p>
    </div>
  )
}
