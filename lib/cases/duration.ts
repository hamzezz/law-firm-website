import { dateKey, daysBetweenKeys } from '@/lib/text/arabic'

/**
 * مدّة القضية: من تاريخ أول جلسة مسجّلة لها حتى تاريخ إغلاقها.
 *
 * كانت تُحسب من تاريخ إنشاء القضية في النظام (opened_at)، وهذا يقيس
 * متى أُدخلت القضية لا متى بدأت أمام المحكمة. فقضيةٌ أُدخلت اليوم
 * وجلستها الأولى قبل سنة كانت تظهر أقصر من حقيقتها بسنة.
 *
 * ومصدرٌ واحد للحساب يستعمله التقرير والتحليلات معاً، فلا يختلف
 * الرقم بين بطاقتين في الصفحة نفسها.
 */

/** أقدم تاريخ جلسة لكل قضية، أيّاً كانت حالتها (منعقدة، لم تُعقد، مجدولة) */
export function firstSessionByCase(sessions: any[] | null | undefined): Record<string, string> {
  const first: Record<string, string> = {}
  for (const s of sessions || []) {
    if (!s || !s.case_id) continue
    const key = dateKey(s.session_date)
    if (!key) continue
    if (!first[s.case_id] || key < first[s.case_id]) first[s.case_id] = key
  }
  return first
}

/**
 * تاريخ الإغلاق بتوقيت عدن.
 *
 * closed_at لحظةٌ بتوقيت غرينتش، فقضيةٌ أُغلقت الساعة الواحدة فجراً
 * بعدن تقع في «أمس» إن اقتُطع التاريخ مباشرة. واليمن لا تعمل بالتوقيت
 * الصيفي، فالإزاحة ثابتة. والحساب نفسه في الخادم والمتصفّح، فلا يختلف
 * العرض بينهما.
 */
function adenDateKey(value: string | null | undefined): string {
  if (!value) return ''
  const t = Date.parse(value)
  if (isNaN(t)) return ''
  return new Date(t + 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * مدّة قضية مغلقة بالأيام، أو null إن تعذّر حسابها:
 *   - القضية غير مغلقة، أو بلا تاريخ إغلاق
 *   - لا جلسة مسجّلة لها — فتُستبعد من المتوسّط، ولا تُحسب من تاريخ
 *     إنشائها حتى لا يختلط حسابان في رقمٍ واحد
 *   - أول جلسة بعد الإغلاق (بيانات متناقضة) — تُستبعد ولا تُحسب سالبة
 */
export function caseDurationDays(c: any, firstByCase: Record<string, string>): number | null {
  if (!c || c.status !== 'closed' || !c.closed_at) return null
  const start = firstByCase[c.id]
  if (!start) return null
  const end = adenDateKey(c.closed_at)
  if (!end) return null
  const days = daysBetweenKeys(start, end)
  return days >= 0 ? days : null
}
