import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArticleSchema, Breadcrumbs } from '@/app/components/page-schema'
import ArticleBody from '../article-body'
import ArticleToc from '../article-toc'
import ArticleShare from '../article-share'
import { parseArticle, formatArabicDate, minutesLabel } from '@/lib/articles/parse'

/** بيانات المشاركة لكل مقال على حدة: عنوانه ومقتطفه وصورته */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, cover_image, category, published_at, updated_at')
    .eq('slug', decodedSlug)
    .eq('status', 'published')
    .single()

  if (!article) return { title: 'مقال غير موجود' }

  const description =
    article.excerpt || 'مقال قانوني من مكتب وليد الكثيري للمحاماة والاستشارات القانونية'
  const url = 'https://kathirilaw.com/articles/' + encodeURIComponent(decodedSlug)
  const image = article.cover_image || '/og-image.png'
  const category = (article as any).category as string | null

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    authors: [{ name: 'مكتب وليد الكثيري للمحاماة والاستشارات القانونية' }],
    ...(category ? { keywords: [category, 'القانون اليمني', 'محامي إب'] } : {}),
    openGraph: {
      title: article.title,
      description,
      url,
      type: 'article',
      siteName: 'مكتب وليد الكثيري للمحاماة',
      locale: 'ar_YE',
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
      ...((article as any).published_at ? { publishedTime: (article as any).published_at } : {}),
      ...((article as any).updated_at ? { modifiedTime: (article as any).updated_at } : {}),
      ...(category ? { section: category, tags: [category, 'القانون اليمني'] } : {}),
      authors: ['مكتب وليد الكثيري للمحاماة والاستشارات القانونية'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [image],
    },
  }
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, content, published_at, updated_at, status, cover_image, category')
    .eq('slug', decodedSlug)
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  const { minutes, headings, references, words } = parseArticle(article.content || '')
  const pageUrl = 'https://kathirilaw.com/articles/' + encodeURIComponent(decodedSlug)

  /**
   * مقالات ذات صلة: من التصنيف نفسه أولاً. فإن لم يكفِ العدد
   * كُمّل بأحدث المقالات، كي لا يقف القارئ عند نهايةٍ مسدودة.
   */
  const related: any[] = []

  if ((article as any).category) {
    const { data } = await supabase
      .from('articles')
      .select('slug, title, excerpt, cover_image, category')
      .eq('status', 'published')
      .eq('category', (article as any).category)
      .neq('slug', decodedSlug)
      .order('published_at', { ascending: false })
      .limit(3)
    related.push(...(data || []))
  }

  if (related.length < 3) {
    const { data } = await supabase
      .from('articles')
      .select('slug, title, excerpt, cover_image, category')
      .eq('status', 'published')
      .neq('slug', decodedSlug)
      .order('published_at', { ascending: false })
      .limit(6)

    for (const r of data || []) {
      if (related.length >= 3) break
      if (!related.some((x) => x.slug === r.slug)) related.push(r)
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <ArticleSchema
        title={article.title}
        description={article.excerpt || ''}
        slug={decodedSlug}
        image={article.cover_image}
        publishedAt={article.published_at}
        updatedAt={(article as any).updated_at}
        section={(article as any).category}
        citations={references}
        wordCount={words}
        sections={headings}
      />
      <Breadcrumbs
        items={[
          { name: 'الرئيسية', path: '/' },
          { name: 'المكتبة القانونية', path: '/articles' },
          { name: article.title, path: '/articles/' + encodeURIComponent(decodedSlug) },
        ]}
      />
      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/*
            هوية المكتب في أقصى اليسار، ورابط الرجوع في اليمين — نفس ترتيب
            صفحة المكتبة القانونية، كي لا تختلف الترويستان على القارئ.
          */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/articles" className="text-amber-200 text-sm hover:text-white transition shrink-0">رجوع لكل المقالات</Link>

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
        </div>
      </header>

      {article.cover_image && (
        <div className="w-full max-h-96 overflow-hidden">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-12 lg:flex lg:gap-12 lg:items-start">
        {/* جدول المحتويات — عمودٌ لاصق على الشاشات الواسعة وحدها */}
        <aside className="hidden lg:block w-56 shrink-0 order-2 sticky top-8">
          <ArticleToc headings={headings} />
        </aside>

        <main className="max-w-[46rem] mx-auto lg:mx-0 min-w-0 flex-1 order-1">
        {(article as any).category && (
          <span className="inline-block text-amber-700 text-xs font-bold mb-3">
            {(article as any).category}
          </span>
        )}
        <h1 className="font-display text-[26px] md:text-3xl font-bold text-slate-900 mb-3 leading-snug text-balance">{article.title}</h1>

        {article.excerpt && (
          <p className="text-slate-500 text-base leading-relaxed mb-6">{article.excerpt}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 text-[13px] mb-10 pb-6 border-b border-slate-100">
          <span className="text-slate-600">
            بقلم <span className="font-bold text-slate-800">فريق مكتب وليد الكثيري للمحاماة</span>
          </span>

          {article.published_at && (
            <time dateTime={new Date(article.published_at).toISOString()}>
              نُشر في {formatArabicDate(article.published_at)}
            </time>
          )}

          {(article as any).updated_at &&
            article.published_at &&
            new Date((article as any).updated_at).toDateString() !==
              new Date(article.published_at).toDateString() && (
              <time dateTime={new Date((article as any).updated_at).toISOString()}>
                آخر تحديث {formatArabicDate((article as any).updated_at)}
              </time>
            )}

          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            قراءة {minutesLabel(minutes)}
          </span>
        </div>

        <ArticleBody content={article.content || ''} />

        <div className="mt-12 pt-6 border-t border-slate-100">
          <ArticleShare url={pageUrl} title={article.title} />
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-slate-900 text-lg mb-5 flex items-center gap-3">
              <span className="w-7 h-[3px] bg-amber-500 rounded-full" />
              اقرأ أيضاً
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={'/articles/' + r.slug}
                  className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-amber-300 hover:shadow-md transition"
                >
                  {r.cover_image && (
                    <img src={r.cover_image} alt={r.title} className="w-full h-28 object-cover" />
                  )}
                  <div className="p-4 flex flex-col flex-1 min-w-0">
                    {r.category && (
                      <span className="text-amber-700 text-[10px] font-bold mb-1">{r.category}</span>
                    )}
                    <h3 className="font-display font-bold text-slate-900 text-sm leading-snug">
                      {r.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        </main>
      </div>
    </div>
  )
}
