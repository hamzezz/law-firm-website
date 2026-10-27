import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumbs, ArticleListSchema } from '../components/page-schema'
import { parseArticle, formatArabicDate } from '@/lib/articles/parse'
import { ARTICLE_CATEGORIES } from '@/lib/articles/categories'
import ArticlesBrowser, { type BrowseArticle } from './articles-browser'

export const metadata = {
  title: 'المكتبة القانونية — مكتب وليد الكثيري للمحاماة',
  description:
    'مقالات وقراءات قانونية يعدّها فريق مكتب وليد الكثيري للمحاماة في محافظة إب، للإسهام في نشر الوعي بالحقوق والإجراءات في التشريع اليمني.',
  alternates: { canonical: 'https://kathirilaw.com/articles' },
  openGraph: {
    title: 'المكتبة القانونية — مكتب وليد الكثيري للمحاماة',
    description:
      'مقالات وقراءات قانونية يعدّها فريق مكتب وليد الكثيري للمحاماة في محافظة إب.',
    url: 'https://kathirilaw.com/articles',
    type: 'website',
  },
}

export default async function ArticlesListPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('articles')
    .select('slug, title, excerpt, content, published_at, cover_image, category, is_featured')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  /**
   * زمن القراءة يُحسب هنا على الخادم مرّة واحدة، فلا يُنقل متن المقال
   * كلّه إلى المتصفّح لمجرّد عدّ كلماته.
   */
  const articles: BrowseArticle[] = (rows || []).map((a: any) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    published_at: a.published_at,
    cover_image: a.cover_image,
    category: a.category || null,
    is_featured: Boolean(a.is_featured),
    minutes: parseArticle(a.content || '').minutes,
    dateLabel: a.published_at ? formatArabicDate(a.published_at) : '',
  }))

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <Breadcrumbs items={[{ name: 'الرئيسية', path: '/' }, { name: 'المكتبة القانونية', path: '/articles' }]} />
      <ArticleListSchema items={articles.map((a) => ({ slug: a.slug, title: a.title, excerpt: a.excerpt }))} />

      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-7">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-amber-200 text-sm hover:text-white transition">رجوع للرئيسية</Link>
          <h1 className="royal-title text-2xl md:text-3xl mt-2">المكتبة القانونية</h1>
          <p className="text-slate-300 text-sm mt-3 max-w-2xl leading-relaxed">
            قراءاتٌ في التشريع اليمني، يُنقل فيها نصّ المادة من القانون نفسه، ويُشار إلى رقمه وسنته وما لحقه من تعديل.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {articles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            لا توجد مقالات منشورة حالياً.
          </div>
        ) : (
          <ArticlesBrowser articles={articles} categories={[...ARTICLE_CATEGORIES]} />
        )}
      </main>
    </div>
  )
}
