import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, content, published_at, status, cover_image')
    .eq('slug', decodedSlug)
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/articles" className="text-amber-200 text-sm hover:text-white transition">رجوع لكل المقالات</Link>
        </div>
      </header>

      {article.cover_image && (
        <div className="w-full max-h-96 overflow-hidden">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <main className="max-w-3xl mx-auto p-6 py-12">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-3 leading-snug">{article.title}</h1>
        {article.published_at && (
          <p className="text-slate-400 text-sm mb-8">{new Date(article.published_at).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        )}
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-loose whitespace-pre-line">{article.content}</p>
        </div>
      </main>
    </div>
  )
}
