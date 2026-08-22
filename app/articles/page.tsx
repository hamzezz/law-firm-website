import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ArticlesListPage() {
  const supabase = await createClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, excerpt, published_at, cover_image')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-amber-200 text-sm hover:text-white transition">رجوع للرئيسية</Link>
          <h1 className="royal-title text-2xl mt-2">المركز الإعلامي والثقافة القانونية</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {(!articles || articles.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-slate-400 text-sm">
            لا توجد مقالات منشورة حالياً.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {articles.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:border-amber-200 transition">
                {a.cover_image && (
                  <img src={a.cover_image} alt={a.title} className="w-full h-44 object-cover" />
                )}
                <div className="p-6">
                  <h2 className="font-display font-bold text-slate-900 text-lg mb-2 leading-snug">{a.title}</h2>
                  {a.excerpt && <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{a.excerpt}</p>}
                  {a.published_at && (
                    <p className="text-slate-400 text-xs mt-4">{new Date(a.published_at).toLocaleDateString('ar-SA')}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
