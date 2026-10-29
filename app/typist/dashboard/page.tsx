import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import LogoutButton from '@/app/staff/logout-button'
import ChangePassword from '@/app/components/change-password'
import EnableNotifications from '@/app/components/enable-notifications'
import RegisterDeviceToken from '@/app/components/register-device-token'
import NotificationBell from '@/app/lawyer/dashboard/notification-bell'
import TypistShell from './typist-shell'
import type { TypistRequest } from './request-card'
import { fetchPrintRequests } from '@/lib/print/fetch'

/**
 * لوحة الطبّاع.
 *
 * جداول مكتب الطباعة محميّة بلا سياسات، فلا تُقرأ من المتصفّح إطلاقاً.
 * وتُقرأ هنا بالعميل الإداري بعد التحقّق من صفة الطبّاع في الخادم.
 */
export default async function TypistDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal.html')

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'typist') redirect('/portal.html')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const requests: TypistRequest[] = await fetchPrintRequests(admin, (q) =>
    q
      .or('assigned_to.eq.' + appUser.id + ',assigned_to.is.null')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
  )

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <RegisterDeviceToken />

      <header className="bg-slate-900 border-b-4 border-amber-500 px-4 py-4 md:px-6 md:py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-base md:text-xl">مكتب الطباعة</h1>
            <p className="text-slate-300 text-[12px] md:text-sm mt-1">مرحباً {appUser.full_name}</p>
          </div>
          <NotificationBell userId={appUser.id} />
        </div>
      </header>

      <TypistShell
        requests={requests}
        account={
          <>
            <div>
              <p className="text-sm font-bold text-slate-800">{appUser.full_name}</p>
              <p className="text-[12px] text-slate-500 mt-1">طبّاع — مكتب وليد الكثيري للمحاماة</p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400 mb-2">الإشعارات الفورية</p>
              <EnableNotifications userId={appUser.id} />
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center gap-2">
              <ChangePassword />
              <LogoutButton />
            </div>
          </>
        }
      />
    </div>
  )
}
