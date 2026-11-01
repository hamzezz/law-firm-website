/**
 * شاشة الانتظار للوحة المحامي — بنفس منطق لوحة المدير.
 * ألوانها تتبع رأس لوحة المحامي (الأخضر) لا الذهبي.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-emerald-600 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="h-6 w-40 rounded bg-white/15 animate-pulse" />
          <div className="h-4 w-28 rounded bg-white/10 animate-pulse mt-3" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-11 rounded-xl bg-white border border-slate-200 animate-pulse" />

        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-5 border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-slate-200 animate-pulse" style={{ width: 60 + i * 6 + '%' }} />
                  <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
