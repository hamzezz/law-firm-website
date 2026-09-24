/**
 * بيانات منظّمة على مستوى الصفحة: مسار التنقل، والمقالات، والأسئلة الشائعة.
 * تُستدعى داخل الصفحة نفسها، وتكمّل التعريف العام في structured-data.
 */

const BASE = 'https://kathirilaw.com'
const ORG_ID = `${BASE}/#organization`
const ATTORNEY_ID = `${BASE}/#attorney`

type Crumb = { name: string; path: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: BASE + c.path,
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function ArticleSchema({
  title,
  description,
  slug,
  image,
  publishedAt,
  updatedAt,
}: {
  title: string
  description: string
  slug: string
  image?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}) {
  const url = `${BASE}/articles/${encodeURIComponent(slug)}`

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'ar',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: image || `${BASE}/og-image.png`,
    author: { '@id': ATTORNEY_ID },
    publisher: { '@id': ORG_ID },
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(updatedAt || publishedAt ? { dateModified: updatedAt || publishedAt } : {}),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function FaqSchema({ items }: { items: { q: string; a: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
