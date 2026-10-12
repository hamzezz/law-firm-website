'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton({ className }: { className?: string } = {}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/client/login')
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
