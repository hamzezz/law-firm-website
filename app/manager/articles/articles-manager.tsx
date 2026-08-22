'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function slugify(text: string) {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0621-\u064Aa-zA-Z0-9-]/g, '')
    .toLowerCase()
}

function statusBadge(status: string) {
  return status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
}

function statusLabel(status: string) {
  return status === 'published' ? 'منشور' : 'مسودة'
}

function AddArticleForm({ authorId, onSuccess }: { authorId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const slug = slugify(title) + '-' + Date.now().toString().slice(-5)

      let coverImageUrl: string | null = null

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + fileExt

        const uploadResult = await supabase.storage.from('article-images').upload(filePath, imageFile)

        if (uploadResult.error) {
          setMessage({ type: 'error', text: 'فشل رفع الصورة: ' + uploadResult.error.message })
          setLoading(false)
          return
        }

        const publicUrlResult = supabase.storage.from('article-images').getPublicUrl(filePath)
        coverImageUrl = publicUrlResult.data.publicUrl
      }

      const { error } = await supabase.from('articles').insert({
        slug,
        title,
        excerpt: excerpt || null,
        content,
        cover_image: coverImageUrl,
        author_id: authorId,
        status: 'draft',
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }

      setMessage({ type: 'success', text: 'تم إنشاء المقال كمسودة بنجاح' })
      setTitle('')
      setExcerpt('')
      setContent('')
      setImageFile(null)
      onSuccess()
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء إنشاء المقال' })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-900 mb-2">إضافة مقال جديد</h3>

      {message && (
        <div className={`text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <input type="text" placeholder="عنوان المقال" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" required />
      <textarea placeholder="مقتطف قصير يظهر في المعاينة" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 h-20 resize-none" />
      <textarea placeholder="محتوى المقال الكامل" value={content} onChange={(e) => setContent(e.target.value)} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 h-40 resize-none" required />

      <div>
        <label className="text-xs text-slate-500 block mb-1">صورة الغلاف (اختياري)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="text-xs w-full" />
      </div>

      <button type="submit" disabled={loading} className="bg-amber-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50">
        {loading ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}
      </button>
    </form>
  )
}

export default function ArticlesManager({ initialArticles, authorId }: any) {
  const [articles, setArticles] = useState(initialArticles)

  async function toggleStatus(id: string, currentStatus: string) {
    const supabase = createClient()
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    const updates: any = { status: newStatus }
    if (newStatus === 'published') updates.published_at = new Date().toISOString()

    const { error } = await supabase.from('articles').update(updates).eq('id', id)
    if (!error) {
      setArticles((prev: any) =>
        prev.map((a: any) => (a.id === id ? { ...a, status: newStatus } : a))
      )
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المقال نهائياً؟')) return
    const supabase = createClient()
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (!error) {
      setArticles((prev: any) => prev.filter((a: any) => a.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <AddArticleForm authorId={authorId} onSuccess={() => window.location.reload()} />

      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <h3 className="font-bold text-slate-900 p-4 border-b border-slate-100">كل المقالات</h3>
        {(!articles || articles.length === 0) && (
          <p className="p-6 text-center text-slate-400 text-sm">لا توجد مقالات بعد.</p>
        )}
        <div className="divide-y divide-slate-100">
          {articles?.map((a: any) => (
            <div key={a.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              {a.cover_image && (
                <img src={a.cover_image} alt={a.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-[200px]">
                <p className="font-bold text-slate-900 text-sm">{a.title}</p>
                {a.excerpt && <p className="text-slate-400 text-xs mt-1">{a.excerpt}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge(a.status)}`}>
                {statusLabel(a.status)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => toggleStatus(a.id, a.status)} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-bold">
                  {a.status === 'published' ? 'إخفاء' : 'نشر'}
                </button>
                <button onClick={() => deleteArticle(a.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-bold">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
