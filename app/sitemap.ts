import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE = 'https://kathirilaw.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/articles`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  try {
    const supabase = await createClient()
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    const articleRoutes: MetadataRoute.Sitemap = (articles || []).map((a: any) => ({
      url: `${BASE}/articles/${encodeURIComponent(a.slug)}`,
      lastModified: new Date(a.updated_at || a.published_at || Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    return [...staticRoutes, ...articleRoutes]
  } catch {
    // إن تعذّر الوصول لقاعدة البيانات، نعيد الصفحات الثابتة على الأقل
    return staticRoutes
  }
}
