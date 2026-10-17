/**
 * حالة وصول الإشعارات — للمدير التقني وحده.
 *
 * ثلاث حالات لا اثنتان، والثالثة أثمنها:
 *   ✓   أُرسل ولم يبلّغ أي جهاز باستلامه  → العطل بين Google والجهاز
 *   ✓✓  وصل الجهاز فعلاً                 → إن لم يره صاحبه فالعطل في عرضه
 *   ✓✓  (أزرق) فتحه صاحبه
 */

function Ticks({ delivered, read }: { delivered: boolean; read: boolean }) {
  const color = read ? '#2563eb' : delivered ? '#94a3b8' : '#cbd5e1'

  return (
    <span
      className="inline-flex shrink-0"
      title={read ? 'فُتح' : delivered ? 'وصل الجهاز' : 'أُرسل ولم يصل'}
      aria-label={read ? 'فُتح' : delivered ? 'وصل الجهاز' : 'أُرسل ولم يصل'}
    >
      <svg viewBox="0 0 20 12" className="w-[15px] h-[11px]" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6.5 L4.5 10 L11 2.5" />
        {delivered && <path d="M7.5 10 L14 2.5" />}
      </svg>
    </span>
  )
}

function shortTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return day + '/' + month + ' ' + hh + ':' + mm
}

export default function DeliveryStatus({ rows }: { rows: any[] }) {
  const list = rows || []

  const undelivered = list.filter((r) => !r.delivered_at).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-display font-bold text-slate-900 text-sm">حالة وصول الإشعارات</h3>
        {list.length > 0 && (
          <span className="text-[11px] text-slate-400 shrink-0">
            {undelivered > 0 ? undelivered + ' لم يصل' : 'كلها وصلت'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-slate-500 mb-3 pb-3 border-b border-slate-100">
        <span className="inline-flex items-center gap-1"><Ticks delivered={false} read={false} /> أُرسل</span>
        <span className="inline-flex items-center gap-1"><Ticks delivered={true} read={false} /> وصل</span>
        <span className="inline-flex items-center gap-1"><Ticks delivered={true} read={true} /> فُتح</span>
      </div>

      {list.length === 0 ? (
        <p className="text-slate-400 text-xs text-center py-6">لا توجد إشعارات بعد.</p>
      ) : (
        <div className="space-y-0">
          {list.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
              <Ticks delivered={!!r.delivered_at} read={!!r.is_read} />
              <span className="text-xs text-slate-700 font-bold shrink-0 max-w-[90px] truncate">
                {r.recipientName}
              </span>
              <span className="text-[11px] text-slate-500 min-w-0 flex-1 truncate">{r.title}</span>
              <span className="text-[10px] text-slate-300 shrink-0" dir="ltr">
                {shortTime(r.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
        «وصل» تعني أن الجهاز أبلغ باستلامه. وبقاء العلامة الواحدة يعني أن الإشعار لم
        يبلغ الجهاز — غالباً من إعدادات توفير البطارية أو إيقاف التطبيق في الخلفية.
      </p>
    </div>
  )
}
