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
 */
export async function withSignedUrls(
  supabase: any,
  documents: DocRow[] | null
): Promise<DocWithUrl[]> {
  return Promise.all(
    (documents || []).map(async (d) => {
      let url: string | null = null

      if (d.storage_provider === 'r2') {
        url = r2Configured() ? await r2SignedUrl(d.storage_path, 3600) : null
      } else {
        const signed = await supabase.storage
          .from('case-documents')
          .createSignedUrl(d.storage_path, 3600)
        url = signed.data ? signed.data.signedUrl : null
      }

      return {
        id: d.id,
        file_name: d.file_name,
        session_id: d.session_id,
        url,
      }
    })
  )
}
