'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { matchesArabic } from '@/lib/text/arabic'

/**
 * البحث العام في لوحة المدير.
 *
 * كان يستعلم قاعدة البيانات عند كل حرف، ويبحث في عنوان القضية ورقمها
 * فقط — فمن بحث باسم موكّل رأى اسمه ولم يرَ قضاياه، وكان صفّ الاسم
 * رابطاً إلى لا شيء. وكان يجلب خمسين موكّلاً ثم يصفّيهم في الذاكرة،
 * فمن كان بعد الخمسين لا يُعثر عليه أبداً.
 *
 * واللوحة تحمّل القضايا كلّها أصلاً، فصار البحث فيها مباشرة: بلا انتظار،
 * وبتطبيعٍ عربي يتجاوز التشكيل وصور الهمزة والأرقام الهندية.
 */
export default function GlobalSearch({ cases }: { cases?: any[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const results = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return []

    return (cases || [])
      .filter((c: any) => {
        const clientName = c.clients?.users?.full_name || ''
        const lawyerName = c.lawyers?.users?.full_name || ''
        const hay = [
          c.case_number,
          c.title,
          clientName,
          lawyerName,
          c.other_party,
          c.court_name,
          c.case_type,
        ]
          .filter(Boolean)
          .join(' ')
        return matchesArabic(hay, q)
      })
      .slice(0, 12)
  }, [cases, query])

  const statusLabel = (s: string) =>
    s === 'closed' ? 'مغلقة' : s === 'postponed' ? 'مؤجّلة' : 'نشطة'

  return (
    <div ref={boxRef} className="relative">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3 px-4 py-3">
        <span className="text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث باسم الموكل أو الخصم أو رقم القضية أو المحكمة..."
          className="flex-1 outline-none text-sm bg-transparent"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false) }}
            className="text-slate-300 hover:text-slate-500 text-lg leading-none"
            aria-label="مسح البحث"
          >
            ×
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 max-h-96 overflow-y-auto z-50">
          <p className="px-4 pt-3 pb-1 text-[10px] text-slate-400">
            {results.length === 0 ? 'لا توجد قضايا مطابقة' : 'القضايا المطابقة — ' + results.length}
          </p>

          {results.map((c: any) => (
            <Link
              key={c.id}
              href={'/manager/cases/' + c.id}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
            >
              <span className="text-lg mt-0.5">📁</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 leading-snug">{c.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {c.case_number}
                  {c.clients?.users?.full_name ? ' — ' + c.clients.users.full_name : ''}
                </p>
                {c.other_party && (
                  <p className="text-[10px] text-slate-400 mt-0.5">الطرف الآخر: {c.other_party}</p>
                )}
              </div>
              <span className="text-[9px] text-slate-400 shrink-0 mt-1">{statusLabel(c.status)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
