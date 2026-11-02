/**
 * حالات الجلسة — مصدرٌ واحد.
 *
 * كانت `sessionStatusLabel` مكرّرةً ثلاث نسخ في ثلاثة ملفّات لا يعرف
 * بعضها بعضاً، وهذا كيف يبدأ الانحراف: تُضاف حالةٌ فتظهر بالعربية في
 * شاشةٍ وبالإنجليزية في أُخرى.
 *
 * والمستعمل فعلاً من النوع `session_status`:
 *   scheduled — مجدولة، ولم يُسجّل قرارها بعد
 *   held      — عُقدت وسُجّل قرارها
 *   not_held  — مضى موعدها ولم تُعقد (عطلة، إضراب، غياب، تعذّر)
 *   postponed — قيمةٌ قائمة في النوع ولا يكتبها الكود في أيّ موضع.
 *               تُركت لأن حذف قيمةٍ من نوعٍ في Postgres غير ممكن،
 *               ووجودها لا يضرّ. ولا تُستعمل لمعنى «لم تُعقد»: هي
 *               تعني «مؤجَّلة» في حالة القضية، فإعطاؤها معنىً ثانياً
 *               يُضلّل من يقرأ الكود لاحقاً.
 */

export const SESSION_STATUS_LABEL: Record<string, string> = {
  scheduled: 'مجدولة',
  held: 'منعقدة',
  not_held: 'لم تُعقد',
  postponed: 'مؤجلة',
}

export function sessionStatusLabel(status: string | null | undefined): string {
  const key = String(status || '').toLowerCase()
  return SESSION_STATUS_LABEL[key] || String(status || '')
}

/**
 * الجلسة التي تنتظر تسجيل قرارها.
 *
 * وهي الشرط الذي يقوم عليه تنبيه «جلسات تنتظر تسجيل القرار» وجلسات
 * الغد والجلسات القادمة عند الموكّل. وجُمع هنا كي لا تُنسى حالةٌ
 * جديدة في موضعٍ من المواضع الستّة التي تقارنه.
 */
export function isAwaitingDecision(status: string | null | undefined): boolean {
  return String(status || '').toLowerCase() === 'scheduled'
}

/** وسم الحالة في البطاقة */
export function sessionStatusTone(status: string | null | undefined): string {
  const key = String(status || '').toLowerCase()
  if (key === 'not_held') return 'bg-slate-200 text-slate-600'
  if (key === 'held') return 'bg-emerald-100 text-emerald-700'
  return 'bg-amber-100 text-amber-700'
}
