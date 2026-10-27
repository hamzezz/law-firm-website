'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ARTICLE_CATEGORIES } from '@/lib/articles/categories'

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
  const [category, setCategory] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
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

      // المقال المختار واحدٌ في الصدارة، فإن مُيّز هذا نُزع التمييز عمّا سبقه
      if (isFeatured) {
        await supabase.from('articles').update({ is_featured: false }).eq('is_featured', true)
      }

      const { error } = await supabase.from('articles').insert({
        slug,
        title,
        excerpt: excerpt || null,
        content,
        category: category || null,
        is_featured: isFeatured,
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
      setCategory('')
      setIsFeatured(false)
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
        <label className="text-xs text-slate-500 block mb-1">التصنيف</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
        >
          <option value="">بلا تصنيف</option>
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="mt-1 w-4 h-4 accent-amber-500"
        />
        <span className="text-sm text-slate-700">
          مقالٌ مختار
          <span className="block text-xs text-slate-400 mt-0.5">
            يظهر في صدارة المكتبة. ولا يكون المختار إلا واحداً، فتمييز هذا ينزع التمييز عمّا سبقه.
          </span>
        </span>
      </label>

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

/** تعديل مقالٍ قائم: تصنيفه وتمييزه ونصّه */
function EditArticleForm({
  article,
  onSaved,
  onCancel,
}: {
  article: any
  onSaved: (patch: any) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(article.title || '')
  const [excerpt, setExcerpt] = useState(article.excerpt || '')
  const [content, setContent] = useState(article.content || '')
  const [category, setCategory] = useState(article.category || '')
  const [isFeatured, setIsFeatured] = useState(Boolean(article.is_featured))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createClient()

    // المختار واحدٌ لا غير
    if (isFeatured && !article.is_featured) {
      await supabase.from('articles').update({ is_featured: false }).eq('is_featured', true)
    }

    const patch = {
      title,
      excerpt: excerpt || null,
      content,
      category: category || null,
      is_featured: isFeatured,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('articles').update(patch).eq('id', article.id)
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }
    onSaved(patch)
  }

  return (
    <form onSubmit={save} className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      {message && <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700">{message}</div>}

      <div>
        <label className="text-xs text-slate-500 block mb-1">العنوان</label>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">المقتطف</label>
        <textarea
          value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm h-20 resize-none bg-white"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">المحتوى</label>
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} required
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm h-56 resize-y bg-white leading-relaxed"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1">التصنيف</label>
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
        >
          <option value="">بلا تصنيف</option>
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox" checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="w-4 h-4 accent-amber-500"
        />
        <span className="text-sm text-slate-700">مقالٌ مختار (يظهر في صدارة المكتبة)</span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading}
          className="bg-amber-500 text-white font-bold px-5 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-50 text-sm">
          {loading ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-white transition">
          إلغاء
        </button>
      </div>
    </form>
  )
}

export default function ArticlesManager({ initialArticles, authorId }: any) {
  const [articles, setArticles] = useState(initialArticles)
  const [editingId, setEditingId] = useState<string | null>(null)

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
            <div key={a.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {a.cover_image && (
                <img src={a.cover_image} alt={a.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-[200px]">
                <p className="font-bold text-slate-900 text-sm">{a.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {a.category && (
                    <span className="text-[11px] text-amber-700 font-bold">{a.category}</span>
                  )}
                  {a.is_featured && (
                    <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                      مختار
                    </span>
                  )}
                </div>
                {a.excerpt && <p className="text-slate-400 text-xs mt-1">{a.excerpt}</p>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge(a.status)}`}>
                {statusLabel(a.status)}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(editingId === a.id ? null : a.id)} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-bold">
                  {editingId === a.id ? 'إغلاق' : 'تعديل'}
                </button>
                <button onClick={() => toggleStatus(a.id, a.status)} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-bold">
                  {a.status === 'published' ? 'إخفاء' : 'نشر'}
                </button>
                <button onClick={() => deleteArticle(a.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-bold">
                  حذف
                </button>
              </div>
            </div>

            {editingId === a.id && (
              <EditArticleForm
                article={a}
                onCancel={() => setEditingId(null)}
                onSaved={(patch) => {
                  setArticles((prev: any) =>
                    prev.map((x: any) =>
                      x.id === a.id
                        ? { ...x, ...patch }
                        : patch.is_featured ? { ...x, is_featured: false } : x
                    )
                  )
                  setEditingId(null)
                }}
              />
            )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
