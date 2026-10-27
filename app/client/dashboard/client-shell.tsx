'use client'

import { useState } from 'react'
import { useHashTab } from '@/app/components/use-hash-tab'
import Link from 'next/link'

/**
 * واجهة لوحة الموكل.
 * على الحاسوب: الرأس الداكن وبطاقات القضايا كما كانت.
 * على الهاتف: رأس نحيف وشريط سفلي (قضاياي / حسابي).
 * لا يتغيّر أي منطق للبيانات — العرض وحده.
 */

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('active')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('postponed')) return 'bg-amber-100 text-amber-700'
  if (s.includes('closed')) return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function statusLabel(status: string) {
  const map: Record<string, string> = { active: 'نشطة', postponed: 'مؤجلة', closed: 'مغلقة' }
  return map[(status || '').toLowerCase()] || status
}

function fmtDate(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return day + '/' + m + '/' + d.getFullYear()
}

export default function ClientShell({
  cases,
  clientName,
  accountActions,
  headerActions,
}: {
  cases: any[]
  clientName: string
  accountActions: React.ReactNode
  headerActions: React.ReactNode
}) {
  const [view, setView] = useHashTab(['cases', 'account'] as const, 'cases')

  return (
    <div>
      {/* رأس واحد يتبدّل شكله بالعرض */}
      <header className="sticky top-0 z-20 flex items-start gap-3 px-4 py-3 bg-white border-b border-slate-200 md:static md:items-center md:gap-4 md:px-6 md:py-5 md:bg-slate-900 md:border-b-4 md:border-blue-600">
        <span className="w-1 self-stretch rounded bg-blue-600 shrink-0 md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-base leading-tight text-slate-900 md:text-xl md:text-white">
            <span className="md:hidden">{view === 'account' ? 'حسابي' : 'قضاياي'}</span>
            <span className="hidden md:inline">قضاياي</span>
          </h1>
          <p className="text-[11px] mt-1 truncate text-slate-500 md:text-xs md:text-slate-300">
            <span className="md:hidden">{clientName}</span>
            <span className="hidden md:inline">متابعة سير القضايا والمحاضر</span>
          </p>
        </div>
        <div className="hidden md:flex shrink-0 items-center gap-4">{headerActions}</div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4 pb-28 md:px-6 md:pt-6 md:pb-12">
        {view === 'cases' && (
          <>
            {(!cases || cases.length === 0) && (
              <div className="bg-white rounded-2xl shadow p-10 text-center text-slate-500">
                لا توجد قضايا مسجلة حالياً.
              </div>
            )}

            <div className="grid gap-3 sm:gap-4">
              {(cases || []).map((c: any) => (
                <Link
                  key={c.id}
                  href={'/client/cases/' + c.id}
                  className="block bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 leading-snug">{c.title}</h2>
                      <p className="text-slate-400 text-xs mt-1.5">رقم القضية: {c.case_number}</p>
                    </div>
                    <span className={'px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ' + statusBadge(c.status)}>
                      {statusLabel(c.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-slate-100">
                    {c.case_type && (
                      <div className="min-w-0">
                        <span className="text-slate-400 text-[11px] block">نوع القضية</span>
                        <span className="font-bold text-slate-800 text-sm block mt-0.5 leading-snug">{c.case_type}</span>
                      </div>
                    )}
                    {c.court_name && (
                      <div className="min-w-0">
                        <span className="text-slate-400 text-[11px] block">المحكمة</span>
                        <span className="font-bold text-slate-800 text-sm block mt-0.5 leading-snug">{c.court_name}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-slate-400 text-[11px] block">تاريخ الفتح</span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5">{fmtDate(c.opened_at)}</span>
                    </div>
                    {c.nextSessionDate && (
                      <div className="min-w-0">
                        <span className="text-slate-400 text-[11px] block">الجلسة القادمة</span>
                        <span className="font-bold text-blue-700 text-sm block mt-0.5">{fmtDate(c.nextSessionDate)}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {view === 'account' && (
          <div className="md:hidden space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 font-display font-bold flex items-center justify-center mx-auto mb-3">
                {(clientName || '؟').trim().charAt(0)}
              </div>
              <p className="font-display font-bold text-slate-900">{clientName}</p>
              <p className="text-slate-500 text-xs mt-1">موكل لدى مكتب وليد الكثيري</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 px-4 shadow-sm">
              {accountActions}
            </div>
          </div>
        )}
      </div>

      {/* الشريط السفلي — الهاتف وحده */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {[
          { k: 'cases' as const, label: 'قضاياي' },
          { k: 'account' as const, label: 'حسابي' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition ' +
              (view === t.k ? 'text-blue-700 font-bold' : 'text-slate-400')
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={view === t.k ? 2 : 1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[22px] h-[22px]"
            >
              {t.k === 'cases' && <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
              {t.k === 'account' && <circle cx="12" cy="8" r="4" />}
              {t.k === 'account' && <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />}
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
