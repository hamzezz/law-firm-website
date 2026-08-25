export default function PredictiveAnalytics({ cases, sessions }: { cases: any[]; sessions: any[] }) {
  // حساب عدد الجلسات لكل قضية
  const sessionsPerCase: Record<string, number> = {}
  for (const s of sessions || []) {
    sessionsPerCase[s.case_id] = (sessionsPerCase[s.case_id] || 0) + 1
  }

  // تجميع حسب نوع القضية
  const byType: Record<string, { totalSessions: number; caseCount: number; closedDurations: number[] }> = {}
  // تجميع حسب المحكمة
  const byCourt: Record<string, { totalSessions: number; caseCount: number }> = {}

  for (const c of cases || []) {
    const type = c.case_type || 'غير محدد'
    const court = c.court_name || 'غير محدد'
    const sessionCount = sessionsPerCase[c.id] || 0

    if (!byType[type]) byType[type] = { totalSessions: 0, caseCount: 0, closedDurations: [] }
    byType[type].totalSessions += sessionCount
    byType[type].caseCount += 1

    if (c.status === 'closed' && c.opened_at && c.closed_at) {
      const days = Math.round(
        (new Date(c.closed_at).getTime() - new Date(c.opened_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      byType[type].closedDurations.push(days)
    }

    if (!byCourt[court]) byCourt[court] = { totalSessions: 0, caseCount: 0 }
    byCourt[court].totalSessions += sessionCount
    byCourt[court].caseCount += 1
  }

  const typeRows = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      avgSessions: data.caseCount > 0 ? (data.totalSessions / data.caseCount).toFixed(1) : '—',
      caseCount: data.caseCount,
      avgDays:
        data.closedDurations.length > 0
          ? Math.round(data.closedDurations.reduce((a, b) => a + b, 0) / data.closedDurations.length)
          : null,
      closedCount: data.closedDurations.length,
    }))
    .sort((a, b) => b.caseCount - a.caseCount)

  const courtRows = Object.entries(byCourt)
    .map(([court, data]) => ({
      court,
      avgSessions: data.caseCount > 0 ? (data.totalSessions / data.caseCount).toFixed(1) : '—',
      caseCount: data.caseCount,
    }))
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 8)

  const hasData = (cases || []).length > 0

  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      <h3 className="font-bold text-slate-900 text-sm mb-1">التحليلات التنبؤية</h3>
      <p className="text-[11px] text-slate-400 mb-4">
        مؤشرات محسوبة من بياناتكم الفعلية — تزداد دقتها كلما تراكمت قضايا مغلقة أكثر.
      </p>

      {!hasData && (
        <p className="text-xs text-slate-400 text-center py-6">
          لا توجد بيانات كافية بعد. ستظهر المؤشرات تلقائياً بعد إدخال قضايا وجلسات.
        </p>
      )}

      {hasData && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">حسب نوع القضية</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-right py-2">النوع</th>
                    <th className="text-right py-2">عدد القضايا</th>
                    <th className="text-right py-2">متوسط الجلسات</th>
                    <th className="text-right py-2">متوسط المدة (يوم)</th>
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((r) => (
                    <tr key={r.type} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700">{r.type}</td>
                      <td className="py-2 text-slate-600">{r.caseCount}</td>
                      <td className="py-2 font-bold text-slate-800">{r.avgSessions}</td>
                      <td className="py-2 text-slate-600">
                        {r.avgDays !== null ? r.avgDays : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">حسب المحكمة</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-right py-2">المحكمة</th>
                    <th className="text-right py-2">عدد القضايا</th>
                    <th className="text-right py-2">متوسط الجلسات</th>
                  </tr>
                </thead>
                <tbody>
                  {courtRows.map((r) => (
                    <tr key={r.court} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700">{r.court}</td>
                      <td className="py-2 text-slate-600">{r.caseCount}</td>
                      <td className="py-2 font-bold text-slate-800">{r.avgSessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
