import Link from 'next/link'
import Image from 'next/image'
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
          {/*
            صفّ الترويسة: رابط الرجوع في اليمين (مبدأ القراءة)، وهوية المكتب
            في أقصى اليسار. والترتيب داخل كتلة الهوية: الشعار أولاً فيقع إلى
            اليمين والاسم عن يساره — كما في شعار المكتب المعتمد.
          */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-amber-200 text-sm hover:text-white transition shrink-0">رجوع للرئيسية</Link>

            <Link
              href="/"
              aria-label="مكتب وليد الكثيري للمحاماة والاستشارات القانونية"
              className="flex items-center gap-2 sm:gap-3 shrink-0 group"
            >
              <div className="text-right leading-tight">
                <span className="block font-display text-white font-bold text-xs sm:text-sm group-hover:text-amber-100 transition">
                  مكتب وليد الكثيري
                </span>
                <span className="block text-amber-200/80 text-[9px] sm:text-[10px] mt-0.5">
                  للمحاماة والاستشارات القانونية
                </span>
              </div>
              <Image
                src="/logo.png"
                alt="شعار مكتب وليد الكثيري"
                width={38}
                height={38}
                className="rounded-full bg-white p-1 shrink-0"
              />
            </Link>
          </div>

          <h1 className="royal-title text-2xl md:text-3xl mt-5">المكتبة القانونية</h1>
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
