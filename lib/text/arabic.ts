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

/** مفتاح تاريخ محلّي (لا بتوقيت غرينتش)، كي لا تنزلق الجلسة يوماً */
export function localDateKey(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
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
