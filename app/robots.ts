import type { MetadataRoute } from 'next'

const BASE = 'https://kathirilaw.com'

/** المسارات الخاصة بالمستخدمين المسجّلين، تُستثنى من الفهرسة */
const PRIVATE_PATHS = ['/client/', '/staff/', '/lawyer/', '/manager/', '/api/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // زواحف نماذج الذكاء الاصطناعي: نسمح لها بالمحتوى العام
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'CCBot', 'anthropic-ai'],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
