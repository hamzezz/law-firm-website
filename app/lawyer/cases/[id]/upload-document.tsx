'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UploadDocument({ caseId, sessionId, uploadedBy }: { caseId: string; sessionId: string; uploadedBy: string }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${sessionId}-${Date.now()}.${fileExt}`
      const filePath = `${caseId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(filePath, file)

      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message })
        setUploading(false)
        return
      }

      const { error: dbError } = await supabase.from('documents').insert({
        case_id: caseId,
        session_id: sessionId,
        file_name: file.name,
        storage_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: uploadedBy,
      })

      if (dbError) {
        setMessage({ type: 'error', text: dbError.message })
        setUploading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم رفع المحضر بنجاح' })
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الرفع' })
    }
    setUploading(false)
  }

  return (
    <div>
      <label className="inline-flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-emerald-100 transition font-bold">
        {uploading ? 'جارٍ الرفع...' : '📎 رفع محضر الجلسة'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {message && (
        <p className={`text-xs mt-1 ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
