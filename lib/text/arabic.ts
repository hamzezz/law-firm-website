/**
 * تطبيع النصّ العربي للبحث.
 *
 * بدونه يفشل البحث في أكثر الأحوال: فمن كتب «احمد» لا يجد «أحمد»،
 * ومن كتب «قضيه» لا يجد «قضية». فيُردّ الحرف إلى أصله قبل المقارنة.
 */
export function normalizeArabic(s: string): string {
  return (s || '')
    // التشكيل والتطويل
    .replace(/[ً-ْـ]/g, '')
    // صور الألف
    .replace(/[أإآٱ]/g, 'ا')
    // الألف المقصورة والتاء المربوطة
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    // الأرقام العربية الهندية إلى لاتينية، ليجد من كتب ١٤٤٨ رقم 1448
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .trim()
}

/**
 * الاسم المختصر: الأول والأخير.
 *
 * أسماء الموكّلين في اليمن رباعية وخماسية، فتكسر سطور البطاقات الضيّقة.
 * ويُترك الاسم كما هو إن كان كلمتين أو أقل، أو إن بدأ بوصفٍ جماعي
 * كـ«ورثة» و«كاتبة»، لأن حذف وسطه يُفسد دلالته.
 */
const COLLECTIVE_PREFIXES = ['ورثة', 'ورثه', 'كاتبة', 'كاتبه', 'شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'جمعية', 'جمعيه']

export function shortArabicName(full: string | null | undefined): string {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return parts.join(' ')
  if (COLLECTIVE_PREFIXES.indexOf(parts[0]) !== -1) {
    // «ورثة عبده أحمد مسعد عبدالرب» ← «ورثة عبده عبدالرب»
    return parts[0] + ' ' + parts[1] + ' ' + parts[parts.length - 1]
  }
  return parts[0] + ' ' + parts[parts.length - 1]
}

/**
 * مفتاح تاريخ من عمودٍ في قاعدة البيانات.
 *
 * والفرق بينها وبين `localDateKey` جوهريّ: تلك تُحوّل النصّ إلى `Date`
 * ثم تقرأ بالتوقيت المحلّي للخادم — فـ «2026-11-03T00:00:00+00» تصير
 * «2026-11-02» في أيّ منطقةٍ سالبة. وهذه تأخذ العشرة الأوائل كما هي،
 * بلا تحويلٍ ولا منطقةٍ زمنية.
 *
 * وكان العمودان يُقرآن بأسلوبين متناقضين في أربعة عشر موضعاً: سبعة
 * بـ`localDateKey` وسبعة بـ`.slice(0,10)`. ولا يختلفان ما دام الخادم
 * على غرينتش أو شرقَها — فإن نُقل غرباً يوماً عادت «جلسة الأمس تظهر
 * اليوم».
 *
 * وتصلح للعمود قبل تحويله إلى `date` وبعده: «2026-11-03T00:00:00+00»
 * و«2026-11-03» كلاهما يعطي المفتاح نفسه.
 *
 * ويبقى `localDateKey` لما هو `Date` حقيقيّ — تاريخ اليوم مثلاً.
 */
export function dateKey(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    const head = value.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head
  }
  return localDateKey(value)
}

/** مفتاح تاريخ محلّي (لا بتوقيت غرينتش)، كي لا تنزلق الجلسة يوماً */
export function localDateKey(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

/** فرق الأيام بين مفتاحَي تاريخ (YYYY-MM-DD) — بلا مناطق زمنية */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const a = String(fromKey || '').split('-').map(Number)
  const b = String(toKey || '').split('-').map(Number)
  if (a.length !== 3 || b.length !== 3) return 0
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000)
}

/** مفتاح تاريخ ← ٠٢/١١/٢٠٢٦ بأرقام إنجليزية */
export function dayMonthYear(key: string): string {
  const p = String(key || '').split('-')
  if (p.length !== 3) return ''
  return p[2] + '/' + p[1] + '/' + p[0]
}

/** تاريخ الغد بالمفتاح المحلّي */
export function tomorrowKey(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localDateKey(d)
}

/** اسم يوم الغد بالعربية: الأربعاء، الخميس… */
export function tomorrowWeekday(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  try {
    return d.toLocaleDateString('ar-EG-u-ca-gregory', { weekday: 'long' })
  } catch {
    return ''
  }
}

/** هل يحتوي النصّ على عبارة البحث بعد تطبيع الاثنين؟ */
export function matchesArabic(haystack: string, needle: string): boolean {
  const n = normalizeArabic(needle)
  if (!n) return true
  return normalizeArabic(haystack).includes(n)
}
