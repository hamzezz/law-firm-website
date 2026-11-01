/**
 * شاشة الانتظار لصفحة القضية (المحامي) — بنفس منطق صفحة المدير،
 * وألوان رأسها الأخضر لا الذهبي.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 md:static md:bg-slate-900 md:border-b-4 md:border-emerald-600 md:px-6 md:py-5">
        <div className="flex items-start gap-3 md:block">
          <div className="md:hidden shrink-0 w-11 h-11 rounded-full bg-slate-100 animate-pulse" />
          <div className="min-w-0 flex-1 md:mt-2 space-y-2">
            <div className="h-5 w-3/5 rounded bg-slate-200 md:bg-white/15 animate-pulse" />
            <div className="h-3 w-32 rounded bg-slate-100 md:bg-white/10 animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl shadow p-5 border border-slate-100 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 rounded bg-slate-200 animate-pulse" style={{ width: 90 + i * 18 }} />
            </div>
          ))}
        </div>

        {[0, 1].map((c) => (
          <div key={c} className="bg-white rounded-2xl shadow p-5 border border-slate-100 space-y-3">
            <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: 70 + i * 8 + '%' }} />
            ))}
          </div>
        ))}
      </main>
    </div>
  )
}
