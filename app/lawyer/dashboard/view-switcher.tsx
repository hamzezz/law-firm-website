'use client'

import { useState } from 'react'
import Link from 'next/link'
import CalendarView from './calendar-view'

/**
 * واجهة لوحة المحامي.
 * على الحاسوب: الرأس الداكن وتبويبان أفقيان كما كان.
 * على الهاتف: رأس نحيف، وجلسات اليوم في الأعلى، وشريط سفلي تحت الإبهام.
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

function dateKey(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

function fmtDate(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return day + '/' + m + '/' + d.getFullYear()
}

function CaseCard({ c }: { c: any }) {
  return (
    <Link
      href={'/lawyer/cases/' + c.id}
      className="block bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition"
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
        <div className="min-w-0">
          <span className="text-slate-400 text-[11px] block">الموكل</span>
          <span className="font-bold text-slate-800 text-sm block mt-0.5 leading-snug">{c.clientName}</span>
        </div>
        {c.other_party && (
          <div className="min-w-0">
            <span className="text-slate-400 text-[11px] block">الطرف الآخر</span>
            <span className="font-bold text-slate-800 text-sm block mt-0.5 leading-snug">{c.other_party}</span>
          </div>
        )}
        {c.case_type && (
          <div className="min-w-0">
            <span className="text-slate-400 text-[11px] block">نوع القضية</span>
            <span className="font-bold text-slate-800 text-sm block mt-0.5">{c.case_type}</span>
          </div>
        )}
        {c.nextSessionDate && (
          <div className="min-w-0">
            <span className="text-slate-400 text-[11px] block">الجلسة القادمة</span>
            <span className="font-bold text-emerald-700 text-sm block mt-0.5">{fmtDate(c.nextSessionDate)}</span>
          </div>
        )}
      </div>

      {!c.primary_lawyer_id && (
        <span className="inline-block mt-3 bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full">
          متاحة لجميع المحامين
        </span>
      )}
    </Link>
  )
}

export default function ViewSwitcher({
  cases,
  calendarEvents,
  lawyerName,
  specialization,
  bell,
  headerActions,
  accountActions,
}: {
  cases: any[]
  calendarEvents: any[]
  lawyerName: string
  specialization: string
  bell: React.ReactNode
  headerActions: React.ReactNode
  accountActions: React.ReactNode
}) {
  const [view, setView] = useState<'cases' | 'calendar' | 'account'>('cases')

  const todayKey = dateKey(new Date().toISOString())
  const todayCases = (cases || []).filter((c) => dateKey(c.nextSessionDate) === todayKey)

  const tabBase = 'px-5 py-3 text-sm font-bold border-b-2 transition'
  const tabOn = tabBase + ' border-emerald-600 text-emerald-700'
  const tabOff = tabBase + ' border-transparent text-slate-500 hover:text-slate-700'

  return (
    <div>
      {/* ===== رأس واحد: نحيف على الهاتف، وداكن على الحاسوب — وجرس واحد لا جرسان ===== */}
      <header className="sticky top-0 z-20 flex items-start gap-3 px-4 py-3 bg-white border-b border-slate-200 md:static md:gap-4 md:items-center md:px-6 md:py-5 md:bg-slate-900 md:border-b-4 md:border-emerald-600">
        <span className="w-1 self-stretch rounded bg-emerald-600 shrink-0 md:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-base leading-tight text-slate-900 md:text-xl md:text-white">
            <span className="md:hidden">
              {view === 'calendar' ? 'التقويم' : view === 'account' ? 'حسابي' : 'قضاياي'}
            </span>
            <span className="hidden md:inline">لوحة تحكم المحامي</span>
          </h1>
          <p className="text-[11px] mt-1 truncate text-slate-500 md:text-xs md:text-slate-300">
            <span className="md:hidden">
              {lawyerName}
              {specialization ? ' — ' + specialization : ''}
            </span>
            <span className="hidden md:inline">
              مرحباً {lawyerName} — {specialization}
            </span>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-4 [&_button]:text-slate-600 md:[&_button]:text-white md:[&_button:hover]:bg-white/10">
          {bell}
          <span className="hidden md:flex items-center gap-4">{headerActions}</span>
        </div>
      </header>

      {/* ===== تبويبات الحاسوب ===== */}
      <div className="hidden md:flex max-w-4xl mx-auto gap-2 mt-6 border-b border-slate-200 px-6">
        <button onClick={() => setView('cases')} className={view === 'cases' ? tabOn : tabOff}>
          قضاياي
        </button>
        <button onClick={() => setView('calendar')} className={view === 'calendar' ? tabOn : tabOff}>
          📅 التقويم
        </button>
      </div>

      {/* ===== المحتوى ===== */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-28 md:px-6 md:pt-6 md:pb-12">
        {view !== 'calendar' && (
          <div className={view === 'account' ? 'hidden md:block' : ''}>
            {todayCases.length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="font-display font-bold text-sm text-slate-700 whitespace-nowrap">
                    جلسات اليوم — {todayCases.length}
                  </h2>
                  <span className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="space-y-2.5">
                  {todayCases.map((c) => (
                    <Link
                      key={'today-' + c.id}
                      href={'/lawyer/cases/' + c.id}
                      className="flex items-start gap-3 bg-white rounded-xl border border-slate-200/80 border-r-[3px] border-r-emerald-600 p-3.5 shadow-sm hover:border-emerald-300 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-slate-900 text-sm leading-snug">{c.clientName}</p>
                        <p className="text-slate-500 text-[11px] mt-1">
                          {c.court_name ? c.court_name + ' — ' : ''}
                          {c.case_number}
                        </p>
                      </div>
                      <span className="text-emerald-700 text-[11px] font-bold shrink-0 mt-0.5">اليوم</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center gap-3 mb-3 md:hidden">
              <h2 className="font-display font-bold text-sm text-slate-700 whitespace-nowrap">
                كل قضاياي — {cases ? cases.length : 0}
              </h2>
              <span className="flex-1 h-px bg-slate-200" />
            </div>

            {(!cases || cases.length === 0) && (
              <div className="bg-white rounded-2xl shadow p-10 text-center text-slate-500">
                لا توجد قضايا مسندة إليك حالياً.
              </div>
            )}

            <div className="grid gap-3 sm:gap-4">
              {(cases || []).map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>
          </div>
        )}

        {view === 'calendar' && <CalendarView events={calendarEvents} />}

        {view === 'account' && (
          <div className="md:hidden space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 font-display font-bold flex items-center justify-center mx-auto mb-3">
                {(lawyerName || '؟').trim().charAt(0)}
              </div>
              <p className="font-display font-bold text-slate-900">{lawyerName}</p>
              <p className="text-slate-500 text-xs mt-1">{specialization}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 px-4 shadow-sm">
              {accountActions}
            </div>
          </div>
        )}
      </div>

      {/* ===== الشريط السفلي — الهاتف وحده ===== */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {[
          { k: 'cases' as const, label: 'قضاياي', icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
          { k: 'calendar' as const, label: 'التقويم', icon: 'M8 3v4M16 3v4M3 10h18' },
          { k: 'account' as const, label: 'حسابي', icon: 'M4 21c0-4 3.6-6 8-6s8 2 8 6' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition ' +
              (view === t.k ? 'text-emerald-700 font-bold' : 'text-slate-400')
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
              {t.k === 'calendar' && <rect x="3" y="5" width="18" height="16" rx="2" />}
              {t.k === 'account' && <circle cx="12" cy="8" r="4" />}
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
