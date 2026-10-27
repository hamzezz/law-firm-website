'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type BrowseArticle = {
  slug: string
  title: string
  excerpt: string | null
  published_at: string | null
  cover_image: string | null
  category: string | null
  is_featured: boolean
  minutes: number
  dateLabel: string
}

/** يُزيل التشكيل وهمزات الوصل ليقارن البحث على أصل الحرف */
function normalize(s: string) {
  return s
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
}

export default function ArticlesBrowser({
  articles,
  categories,
}: {
  articles: BrowseArticle[]
  categories: string[]
}) {
  const [cat, setCat] = useState<string | null>(null)
  const [q, setQ] = useState('')

  /** التصنيفات التي فيها مقالات فعلاً — لا تُعرض خانة فارغة */
  const usedCategories = useMemo(() => {
    const present = new Set(articles.map((a) => a.category).filter(Boolean) as string[])
    return categories.filter((c) => present.has(c))
  }, [articles, categories])

  const featured = useMemo(
    () => articles.find((a) => a.is_featured) || null,
    [articles]
  )

  const list = useMemo(() => {
    const needle = normalize(q.trim())
    return articles
      .filter((a) => (featured ? a.slug !== featured.slug : true))
      .filter((a) => (cat ? a.category === cat : true))
      .filter((a) => {
        if (!needle) return true
        const hay = normalize(a.title + ' ' + (a.excerpt || '') + ' ' + (a.category || ''))
        return hay.includes(needle)
      })
  }, [articles, featured, cat, q])

  const showFeatured = featured && !cat && q.trim() === ''

  return (
    <div className="space-y-8">
      {showFeatured && (
        <Link
          href={'/articles/' + featured.slug}
          className="block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-amber-300 hover:shadow-md transition md:flex"
        >
          {featured.cover_image && (
            <img
              src={featured.cover_image}
              alt={featured.title}
              className="w-full h-48 object-cover md:w-[46%] md:h-auto md:min-h-[14rem]"
            />
          )}
          <div className="p-6 md:p-7 flex flex-col justify-center min-w-0">
            <span className="text-amber-700 text-[11px] font-bold tracking-wide mb-2">
              مقالٌ مختار
            </span>
            <h2 className="font-display font-bold text-slate-900 text-xl leading-snug mb-2 text-balance">
              {featured.title}
            </h2>
            {featured.excerpt && (
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">{featured.excerpt}</p>
            )}
            <div className="flex items-center gap-3 text-slate-400 text-xs mt-4">
              {featured.category && <span className="text-slate-600">{featured.category}</span>}
              <span>{featured.dateLabel}</span>
              <span>قراءة {featured.minutes} د</span>
            </div>
          </div>
        </Link>
      )}

      {/* أدوات التصفية */}
      <div className="space-y-3">
        <div className="relative">
          <input
            id="articles-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في المكتبة…"
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pr-11 pl-4 text-sm outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-300 transition"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </div>

        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCat(null)}
              className={
                'px-3.5 py-1.5 rounded-full text-[13px] border transition ' +
                (cat === null
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300')
              }
            >
              الكل
            </button>
            {usedCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c === cat ? null : c)}
                className={
                  'px-3.5 py-1.5 rounded-full text-[13px] border transition ' +
                  (cat === c
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300')
                }
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-slate-500 text-sm">لا توجد مقالات مطابقة.</p>
          {(cat || q) && (
            <button
              onClick={() => { setCat(null); setQ('') }}
              className="text-amber-700 text-sm font-bold mt-3 hover:underline"
            >
              عرض كل المقالات
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {list.map((a) => (
            <Link
              key={a.slug}
              href={'/articles/' + a.slug}
              className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-amber-300 hover:shadow-md transition"
            >
              {a.cover_image && (
                <img src={a.cover_image} alt={a.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-5 flex flex-col flex-1 min-w-0">
                {a.category && (
                  <span className="text-amber-700 text-[11px] font-bold mb-1.5">{a.category}</span>
                )}
                <h3 className="font-display font-bold text-slate-900 text-[17px] leading-snug mb-2">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="text-slate-500 text-[13px] leading-relaxed line-clamp-3">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-auto pt-4">
                  <span>{a.dateLabel}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>قراءة {a.minutes} د</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
