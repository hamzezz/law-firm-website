'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/about', label: 'عن المكتب' },
  { href: '/#specialties', label: 'التخصصات' },
  { href: '/#media', label: 'المكتبة القانونية' },
  { href: '/#contact', label: 'تواصل معنا' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
        className="text-slate-300 hover:text-white transition p-1.5"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm" dir="rtl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <span className="font-display text-white font-bold text-sm">مكتب وليد الكثيري</span>
            <button onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="text-slate-400 hover:text-white transition p-1">
              <X size={22} />
            </button>
          </div>

          <nav className="px-5 py-6 flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-slate-200 font-bold text-base py-4 border-b border-slate-800/70 hover:text-amber-300 transition"
              >
                {l.label}
              </Link>
            ))}

            <Link
              href="/staff/login"
              onClick={() => setOpen(false)}
              className="text-slate-500 text-xs mt-8 hover:text-amber-300 transition"
            >
              دخول فريق العمل
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
