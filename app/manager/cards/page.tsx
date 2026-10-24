import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LEGAL_POSTS } from '@/lib/posts/legal-posts'
import CardStudio from './card-studio'

export const metadata = {
  title: 'بطاقات المنشورات',
  robots: { index: false, follow: false },
}

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') redirect('/portal.html')

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 md:static md:bg-slate-900 md:border-b-4 md:border-amber-500 md:px-6 md:py-5">
        <div className="max-w-6xl mx-auto flex items-start gap-3 md:block">
          <Link
            href="/manager/dashboard"
            aria-label="رجوع للوحة"
            className="md:hidden shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>

          <Link href="/manager/dashboard" className="hidden md:inline text-slate-300 text-sm hover:text-white transition">
            رجوع للوحة
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-slate-900 text-base leading-snug md:text-white md:text-xl md:mt-2">
              بطاقات المنشورات
            </h1>
            <p className="text-slate-500 text-[11px] mt-1 md:text-slate-400 md:text-xs">
              صور جاهزة للنشر، ونصوصها للنسخ
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 md:p-6">
        <CardStudio posts={LEGAL_POSTS} />
      </main>
    </div>
  )
}
