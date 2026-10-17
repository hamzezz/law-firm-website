export type DocRow = {
  id: string
  file_name: string
  session_id: string | null
  storage_path?: string
  storage_provider?: string | null
}

export type DocWithUrl = {
  id: string
  file_name: string
  session_id: string | null
  url: string
}

/**
 * روابط المستندات.
 *
 * لم تعد الصفحة توقّع شيئاً: الرابط يشير إلى بوابة الفتح، وهي من تتحقّق
 * من الصلاحية وتسجّل وتوقّع لدقيقة واحدة عند الضغط.
 *
 * ومكسبان في هذا: الصفحة لا تنتظر توقيعاً عند عرضها، ولا يحمل مصدرها
 * روابط صالحة لساعة لكل مستند — كانت تلك الروابط تعيش في صفحة مفتوحة
 * على مكتب أو في ذاكرة متصفح، وكلٌّ منها مفتاح لا يُسأل حامله.
 */
export function documentLinks(documents: DocRow[] | null): DocWithUrl[] {
  return (documents || []).map((d) => ({
    id: d.id,
    file_name: d.file_name,
    session_id: d.session_id,
    url: '/api/documents/' + d.id,
  }))
}
