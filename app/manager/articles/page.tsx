import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/client/dashboard/logout-button'
import ArticlesManager from './articles-manager'

export default async function ManagerArticlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/staff/login')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') redirect('/staff/login')

  const { data: articles } = await supabase
    .from('articles')
    .select('id, slug, title, excerpt, status, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-amber-500 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="royal-title text-2xl">إدارة المقالات</h1>
          <p className="text-slate-300 text-xs mt-1">مرحباً {appUser.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/manager/dashboard" className="text-slate-300 text-sm hover:text-white transition">رجوع للوحة التحكم</a>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <ArticlesManager initialArticles={articles || []} authorId={appUser.id} />
      </main>
    </div>
  )
}
