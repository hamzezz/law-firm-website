import { r2SignedUrl, r2Configured } from '@/lib/r2/client'

type DocRow = {
  id: string
  file_name: string
  session_id: string | null
  storage_path: string
  storage_provider?: string | null
}

export type DocWithUrl = {
  id: string
  file_name: string
  session_id: string | null
  url: string | null
}

/**
 * رابط قراءة موقّت لكل مستند، أينما كان مخزّناً.
 * المستندات الحيّة في Supabase Storage، والمؤرشفة (قضايا مغلقة) على R2.
 * الصلاحيات لا تتغيّر بالأرشفة: من كان يرى المستند يراه بعدها.
 *
 * مستندات Supabase تُوقَّع دفعة واحدة لا واحداً واحداً: جلسة فيها عشرة
 * مستندات كانت عشرة طلبات، وصارت طلباً واحداً. ومستندات R2 تُوقَّع
 * محلياً بلا شبكة، فتوازيها كافٍ.
 */
export async function withSignedUrls(
  supabase: any,
  documents: DocRow[] | null
): Promise<DocWithUrl[]> {
  const docs = documents || []
  if (docs.length === 0) return []

  const urlByDocId: Record<string, string | null> = {}

  const supabaseDocs = docs.filter((d) => d.storage_provider !== 'r2')
  const r2Docs = docs.filter((d) => d.storage_provider === 'r2')

  await Promise.all([
    // ── Supabase Storage: طلب واحد لكل المسارات ──
    (async () => {
      if (supabaseDocs.length === 0) return

      const paths = supabaseDocs.map((d) => d.storage_path)
      const { data, error } = await supabase.storage
        .from('case-documents')
        .createSignedUrls(paths, 3600)

      if (error || !data) {
        console.log('[documents] تعذّر توقيع روابط Supabase | ' + (error?.message || 'لا بيانات'))
        supabaseDocs.forEach((d) => { urlByDocId[d.id] = null })
        return
      }

      // الترتيب الراجع مطابق لترتيب المسارات المرسلة
      supabaseDocs.forEach((d, i) => {
        const row = data[i]
        urlByDocId[d.id] = row && !row.error && row.signedUrl ? row.signedUrl : null
      })
    })(),

    // ── R2: توقيع محلي، بلا رحلة شبكة ──
    (async () => {
      if (r2Docs.length === 0) return

      if (!r2Configured()) {
        r2Docs.forEach((d) => { urlByDocId[d.id] = null })
        return
      }

      await Promise.all(
        r2Docs.map(async (d) => {
          try {
            urlByDocId[d.id] = await r2SignedUrl(d.storage_path, 3600)
          } catch (err: any) {
            console.log('[documents] تعذّر توقيع رابط R2 | doc=' + d.id + ' | ' + (err && err.message))
            urlByDocId[d.id] = null
          }
        })
      )
    })(),
  ])

  // الترتيب الأصلي للمستندات كما جاءت، لا ترتيب التقسيم
  return docs.map((d) => ({
    id: d.id,
    file_name: d.file_name,
    session_id: d.session_id,
    url: urlByDocId[d.id] ?? null,
  }))
}
