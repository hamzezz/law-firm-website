'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StaffLogoutButton({ className }: { className?: string } = {}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/staff/login')
    router.refresh()
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
