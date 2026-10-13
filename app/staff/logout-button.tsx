'use client'

import { createClient } from '@/lib/supabase/client'

export default function StaffLogoutButton({ className }: { className?: string } = {}) {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // بوابة الشعاع صفحة ثابتة خارج موجّه Next، فالانتقال إليها انتقال كامل.
    // stay=1 يمنع ارتداداً عائداً إلى اللوحة إن تأخّر محو الجلسة لحظةً.
    window.location.href = '/portal.html?stay=1'
  }

  return (
    <button
      onClick={handleLogout}
      className={className || 'text-sm text-slate-300 hover:text-white transition'}
    >
      تسجيل الخروج
    </button>
  )
}
