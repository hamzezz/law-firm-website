function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return 'منذ ' + diffMin + ' دقيقة'
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return 'منذ ' + diffHours + ' ساعة'
  const diffDays = Math.floor(diffHours / 24)
  return 'منذ ' + diffDays + ' يوم'
}

function actionIcon(action: string) {
  if (action === 'case_created') return '📁'
  if (action === 'session_locked') return '✅'
  if (action === 'deadline_created') return '⏰'
  return '•'
}

export default function AuditLog({ logs }: { logs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      <h3 className="font-bold text-slate-900 mb-3 text-sm">سجل النشاط والتدقيق</h3>

      {(!logs || logs.length === 0) && (
        <p className="text-slate-400 text-xs text-center py-6">لا يوجد نشاط مسجَّل بعد.</p>
      )}

      <div className="space-y-1">
        {logs?.map((log: any) => (
          <div key={log.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
            <span className="text-sm">{actionIcon(log.action)}</span>
            <div className="flex-1">
              <p className="text-xs text-slate-700">
                <strong>{log.users ? log.users.full_name : 'مستخدم'}</strong> — {log.metadata ? log.metadata.description : ''}
              </p>
            </div>
            <span className="text-[10px] text-slate-300 whitespace-nowrap">{timeAgo(log.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
