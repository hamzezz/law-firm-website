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

const ACTION_ICONS: Record<string, string> = {
  // محفّزات قاعدة البيانات
  case_created: '📁',
  session_locked: '✅',
  deadline_created: '⏰',
  // الحسابات والصلاحيات
  lawyer_created: '👤',
  client_created: '🧑‍💼',
  account_deleted: '🗑️',
  password_changed: '🔑',
  case_access_granted: '🔓',
  case_access_revoked: '🔒',
  // القضايا والجلسات
  case_updated: '✏️',
  case_deleted: '❌',
  case_closed: '📕',
  session_created: '📅',
  sessions_uploaded: '📎',
  // المستندات والأرشفة
  document_uploaded: '📄',
  document_deleted: '🗑️',
  document_opened: '👁️',
  document_access_denied: '🚫',
  case_archived: '📦',
  backup_downloaded: '💾',
  // الدخول
  login_success: '🔐',
  login_failed: '⛔',
}

function actionIcon(action: string) {
  return ACTION_ICONS[action] || '•'
}

/** الأحداث التي تستحقّ لفت النظر وإن لم تكن خطأً */
const SENSITIVE = [
  'account_deleted',
  'case_deleted',
  'login_failed',
  'password_changed',
  'document_access_denied',
  'document_deleted',
]

export default function AuditLog({ logs }: { logs: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      <h3 className="font-bold text-slate-900 mb-3 text-sm">سجل النشاط والتدقيق</h3>

      {(!logs || logs.length === 0) && (
        <p className="text-slate-400 text-xs text-center py-6">لا يوجد نشاط مسجَّل بعد.</p>
      )}

      <div className="space-y-1">
        {logs?.map((log: any) => (
          <div
            key={log.id}
            className={
              'flex items-start gap-2.5 py-2.5 border-b border-slate-50 last:border-0 ' +
              (SENSITIVE.indexOf(log.action) !== -1 ? 'bg-red-50/40 -mx-2 px-2 rounded' : '')
            }
          >
            <span className="text-sm shrink-0">{actionIcon(log.action)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>{log.users ? log.users.full_name : 'النظام'}</strong>
                {log.metadata && log.metadata.description ? ' — ' + log.metadata.description : ''}
              </p>
            </div>
            <span className="text-[10px] text-slate-300 whitespace-nowrap">{timeAgo(log.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
