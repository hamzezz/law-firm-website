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

/** هل يحتوي النصّ على عبارة البحث بعد تطبيع الاثنين؟ */
export function matchesArabic(haystack: string, needle: string): boolean {
  const n = normalizeArabic(needle)
  if (!n) return true
  return normalizeArabic(haystack).includes(n)
}
