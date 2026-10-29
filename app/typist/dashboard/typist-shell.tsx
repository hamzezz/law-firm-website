'use client'

import type { ReactNode } from 'react'
import { useHashTab } from '@/app/components/use-hash-tab'
import RequestCard, { type TypistRequest, dueInfo } from './request-card'

/**
 * لوحة الطبّاع — مقسومة على يومه لا على حالات قاعدة البيانات:
 *
 *  • الوارد      ما ينتظر عمله: الجديد، وما عاد إليه بملاحظات.
 *  • المرسَلة    ما أنجزه وينتظر مراجعة المدير — لا شيء عليه فيه.
 *  • المعتمدة    ما فُرغ منه، للرجوع إليه.
 *  • حسابي       الإشعارات وكلمة المرور والخروج.
 *
 * والفصل بين «الوارد» و«المرسَلة» هو جوهر الترتيب: الطبّاع يفتح لوحته
 * ليعرف ما عليه الآن، لا ليقرأ كل شيء.
 */

const TABS = ['inbox', 'sent', 'done', 'account'] as const
type Tab = (typeof TABS)[number]

/** الأقرب ميعاداً أولاً، ثم الأقدم وصولاً — فلا يُنسى طلبٌ لأنه قديم */
function byUrgency(a: TypistRequest, b: TypistRequest) {
  const da = a.dueDate || ''
  const db = b.dueDate || ''
  if (da && db && da !== db) return da < db ? -1 : 1
  if (da && !db) return -1
  if (!da && db) return 1
  return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1
}

function Icon({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round"
      className="w-[22px] h-[22px]"
    >
      {tab === 'inbox' && (
        <>
          <path d="M5 4h14l2 9v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
          <path d="M3 13h5l1.5 3h5L16 13h5" />
        </>
      )}
      {tab === 'sent' && <path d="M4 12l16-8-7 16-2-6z" />}
      {tab === 'done' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </>
      )}
      {tab === 'account' && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </>
      )}
    </svg>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-slate-400 text-sm py-14 text-center leading-relaxed">{text}</p>
}

function Panel({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[12px] font-bold text-slate-500">{title}</span>
        <span className="text-[12px] text-slate-400">{count}</span>
      </div>
      {children}
    </section>
  )
}

export default function TypistShell({
  requests,
  account,
}: {
  requests: TypistRequest[]
  account: ReactNode
}) {
  const [tab, go] = useHashTab(TABS, 'inbox')

  const inbox = requests.filter((r) => r.status === 'new' || r.status === 'typing').sort(byUrgency)
  const sent = requests.filter((r) => r.status === 'review').sort(byUrgency)
  const done = requests.filter((r) => r.status === 'approved')

  // أقرب ميعادٍ في الوارد — يُذكر في سطر واحد أعلى الشاشة
  const nearest = inbox.find((r) => r.dueDate)
  const nearestDue = nearest ? dueInfo(nearest.dueDate) : null

  const NAV: { k: Tab; label: string; badge?: number }[] = [
    { k: 'inbox', label: 'الوارد', badge: inbox.length },
    { k: 'sent', label: 'المرسَلة', badge: sent.length },
    { k: 'done', label: 'المعتمدة' },
    { k: 'account', label: 'حسابي' },
  ]

  return (
    <>
      {/* على الحاسوب: تبويبات علوية بدل الشريط السفلي */}
      <div className="hidden md:flex max-w-4xl mx-auto px-6 pt-5 gap-2">
        {NAV.map((t) => (
          <button
            key={t.k}
            onClick={() => go(t.k)}
            className={
              'px-4 py-2 rounded-xl text-sm font-bold transition ' +
              (tab === t.k
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300')
            }
          >
            {t.label}{t.badge ? ' (' + t.badge + ')' : ''}
          </button>
        ))}
      </div>

      <main className="max-w-4xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4 pb-28 md:pb-10">

        {tab === 'inbox' && (
          <>
            {inbox.length > 0 && (
              <div className="bg-slate-900 text-white rounded-2xl px-5 py-4">
                <p className="text-sm font-bold">
                  {inbox.length === 1 ? 'طلبٌ واحد ينتظرك' : inbox.length + ' طلبات تنتظرك'}
                </p>
                {nearest && nearestDue && (
                  <p className="text-[12px] text-slate-300 mt-1">
                    أقربها ميعاداً: {nearest.docType} — {nearestDue.label}
                  </p>
                )}
              </div>
            )}

            <Panel title="ما ينتظر عملك" count={inbox.length}>
              {inbox.length === 0 ? (
                <Empty text="لا شيء ينتظرك الآن." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {inbox.map((r) => <RequestCard key={r.id} request={r} />)}
                </div>
              )}
            </Panel>
          </>
        )}

        {tab === 'sent' && (
          <Panel title="بانتظار مراجعة المدير" count={sent.length}>
            {sent.length === 0 ? (
              <Empty text="لا توجد مسودّات بانتظار المراجعة." />
            ) : (
              <div className="divide-y divide-slate-100">
                {sent.map((r) => <RequestCard key={r.id} request={r} />)}
              </div>
            )}
          </Panel>
        )}

        {tab === 'done' && (
          <Panel title="ما اعتُمد" count={done.length}>
            {done.length === 0 ? (
              <Empty text="لم يُعتمد شيء بعد." />
            ) : (
              <div className="divide-y divide-slate-100">
                {done.map((r) => {
                  const last = r.drafts.length > 0 ? r.drafts[r.drafts.length - 1] : null
                  return (
                    <div key={r.id} className="px-5 py-4 border-r-4 border-emerald-400">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700">{r.docType}</p>
                          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                            {r.caseTitle}{r.caseNumber ? ' — ' + r.caseNumber : ''}
                          </p>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          معتمد
                        </span>
                      </div>

                      {last && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[11px] text-slate-400">النسخة المعتمدة</span>
                          {last.word_path && (
                            <a href={'/api/print-drafts/' + last.id + '?f=word'} target="_blank" rel="noreferrer"
                               className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100 transition">
                              Word
                            </a>
                          )}
                          {last.pdf_path && (
                            <a href={'/api/print-drafts/' + last.id + '?f=pdf'} target="_blank" rel="noreferrer"
                               className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold hover:bg-red-100 transition">
                              PDF
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        )}

        {tab === 'account' && (
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            {account}
          </section>
        )}
      </main>

      {/* الشريط السفلي — بلغة التطبيق نفسها في بقية اللوحات */}
      <nav
        className="fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 flex md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV.map((t) => {
          const active = tab === t.k
          return (
            <button
              key={t.k}
              onClick={() => go(t.k)}
              className={
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] transition relative ' +
                (active ? 'text-emerald-700 font-bold' : 'text-slate-400')
              }
            >
              <span className="relative">
                <Icon tab={t.k} active={active} />
                {t.badge ? (
                  <span className="absolute -top-1.5 -left-2 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                ) : null}
              </span>
              {t.label}
            </button>
          )
        })}
      </nav>

    </>
  )
}
