/**
 * شاشة الانتظار للوحة المدير.
 *
 * بدونها تبقى الشاشة جامدة حتى يصل كل شيء من الخادم، فيبدو التأخير
 * أطول مما هو. ووجود هذا الملف يجعل Next.js يجهّز هيكل الصفحة مسبقاً
 * عند الروابط التي تحمل prefetch، فيظهر فور الضغط.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-gradient-to-l from-slate-900 to-amber-950 border-b-4 border-amber-500 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-7 w-48 rounded bg-white/15 animate-pulse" />
          <div className="h-4 w-32 rounded bg-white/10 animate-pulse mt-3" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-5 border border-slate-100">
              <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-7 w-12 rounded bg-slate-200 animate-pulse mt-3" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded bg-slate-200 animate-pulse" style={{ width: 55 + i * 7 + '%' }} />
                <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-6 w-16 rounded-full bg-slate-100 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
