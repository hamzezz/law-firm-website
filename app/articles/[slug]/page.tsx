import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArticleSchema, Breadcrumbs } from '@/app/components/page-schema'
import ArticleBody from '../article-body'
import { parseArticle, formatArabicDate, minutesLabel } from '@/lib/articles/parse'

/** بيانات المشاركة لكل مقال على حدة: عنوانه ومقتطفه وصورته */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, cover_image')
    .eq('slug', decodedSlug)
    .eq('status', 'published')
    .single()

  if (!article) return { title: 'مقال غير موجود' }

  const description =
    article.excerpt || 'مقال قانوني من مكتب وليد الكثيري للمحاماة والاستشارات القانونية'
  const url = 'https://kathirilaw.com/articles/' + encodeURIComponent(decodedSlug)
  const image = article.cover_image || '/og-image.png'

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: 'article',
      siteName: 'مكتب وليد الكثيري للمحاماة',
      locale: 'ar_YE',
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
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
    .select('title, excerpt, content, published_at, updated_at, status, cover_image')
    .eq('slug', decodedSlug)
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  const { minutes } = parseArticle(article.content || '')

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <ArticleSchema
        title={article.title}
        description={article.excerpt || ''}
        slug={decodedSlug}
        image={article.cover_image}
        publishedAt={article.published_at}
        updatedAt={(article as any).updated_at}
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
          <Link href="/articles" className="text-amber-200 text-sm hover:text-white transition">رجوع لكل المقالات</Link>
        </div>
      </header>

      {article.cover_image && (
        <div className="w-full max-h-96 overflow-hidden">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <main className="max-w-[46rem] mx-auto px-6 py-12">
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
      </main>
    </div>
  )
}
