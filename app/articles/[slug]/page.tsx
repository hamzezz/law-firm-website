import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArticleSchema, Breadcrumbs } from '@/app/components/page-schema'

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

      <main className="max-w-3xl mx-auto p-6 py-12">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-3 leading-snug">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400 text-[13px] mb-8 pb-6 border-b border-slate-100">
          <span className="text-slate-600">
            بقلم <span className="font-bold text-slate-800">فريق مكتب وليد الكثيري للمحاماة</span>
          </span>

          {article.published_at && (
            <time dateTime={new Date(article.published_at).toISOString()}>
              نُشر في {new Date(article.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          )}

          {(article as any).updated_at &&
            article.published_at &&
            new Date((article as any).updated_at).toDateString() !==
              new Date(article.published_at).toDateString() && (
              <time dateTime={new Date((article as any).updated_at).toISOString()}>
                آخر تحديث {new Date((article as any).updated_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
            )}
        </div>
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-700 leading-loose whitespace-pre-line">{article.content}</p>
        </div>
      </main>
    </div>
  )
}
