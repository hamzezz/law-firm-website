import { firstSessionByCase, caseDurationDays } from '@/lib/cases/duration'

export default function ReportsPanel({ cases, sessions }: { cases: any[]; sessions?: any[] }) {
  const closedCases = (cases || []).filter((c: any) => c.status === 'closed')
  const wonCases = closedCases.filter((c: any) => c.outcome === 'لصالحنا')
  const winRate = closedCases.length > 0 ? Math.round((wonCases.length / closedCases.length) * 100) : null

  // من أول جلسة حتى الإغلاق — والقضية المغلقة بلا جلسات لا تدخل المتوسّط
  const avgDurationDays = (() => {
    const firstByCase = firstSessionByCase(sessions)
    const durations = closedCases
      .map((c: any) => caseDurationDays(c, firstByCase))
      .filter((d: number | null): d is number => d !== null)
    if (durations.length === 0) return null
    return Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
  })()

  const lawyerStats: Record<string, number> = {}
  for (const c of cases || []) {
    const name = c.lawyers && c.lawyers.users ? c.lawyers.users.full_name : 'غير مخصصة'
    lawyerStats[name] = (lawyerStats[name] || 0) + 1
  }
  const sortedLawyers = Object.entries(lawyerStats).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const stageStats: Record<string, number> = {}
  for (const c of cases || []) {
    const stage = c.stage || 'ابتدائي'
    stageStats[stage] = (stageStats[stage] || 0) + 1
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow p-5 text-center border border-slate-100">
          <p className="text-2xl font-bold text-emerald-600">{winRate !== null ? winRate + '%' : '—'}</p>
          <p className="text-[10px] text-slate-500 mt-1">نسبة كسب القضايا المغلقة</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 text-center border border-slate-100">
          <p className="text-2xl font-bold text-blue-600">{avgDurationDays !== null ? avgDurationDays : '—'}</p>
          <p className="text-[10px] text-slate-500 mt-1">متوسط أيام القضية (من أول جلسة حتى الإغلاق)</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5 text-center border border-slate-100">
          <p className="text-2xl font-bold text-slate-700">{closedCases.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">إجمالي القضايا المغلقة</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
          <p className="text-xs font-bold text-slate-900 mb-3">توزيع القضايا حسب المحامي</p>
          {sortedLawyers.length === 0 && <p className="text-[11px] text-slate-400">لا توجد بيانات كافية.</p>}
          {sortedLawyers.map(([name, count]) => (
            <div key={name} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-slate-600">{name}</span>
              <span className="font-bold text-slate-800">{count} قضية</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
          <p className="text-xs font-bold text-slate-900 mb-3">توزيع القضايا حسب المرحلة</p>
          {Object.entries(stageStats).map(([stage, count]) => (
            <div key={stage} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
              <span className="text-slate-600">{stage}</span>
              <span className="font-bold text-slate-800">{count} قضية</span>
            </div>
          ))}
        </div>
      </div>

      {closedCases.length === 0 && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-3">
          ⚠️ لا توجد قضايا مغلقة بعد — التقارير المتعلقة بنسبة الكسب ومدة القضايا ستظهر تلقائياً بمجرد إغلاق قضايا حقيقية.
        </p>
      )}
    </div>
  )
}
