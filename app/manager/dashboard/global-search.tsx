'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<any>(null)
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

  function handleChange(value: string) {
    setQuery(value)
    setOpen(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (value.trim().length < 2) {
      setResults([])
      return
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const q = value.trim()

      const { data: caseResults } = await supabase
        .from('cases')
        .select('id, case_number, title, clients ( users ( full_name ) )')
        .or('case_number.ilike.%' + q + '%,title.ilike.%' + q + '%')
        .limit(6)

      const { data: clientResults } = await supabase
        .from('clients')
        .select('id, national_id, users ( full_name, phone )')
        .limit(50)

      const matchedClients = (clientResults || []).filter((c: any) => {
        const name = c.users ? c.users.full_name : ''
        const phone = c.users ? c.users.phone : ''
        return (name && name.includes(q)) || (phone && phone.includes(q))
      }).slice(0, 4)

      const combined = [
        ...(caseResults || []).map((c: any) => ({
          kind: 'case',
          id: c.id,
          label: c.title,
          sub: c.case_number + ' — ' + (c.clients && c.clients.users ? c.clients.users.full_name : ''),
        })),
        ...matchedClients.map((c: any) => ({
          kind: 'client',
          id: c.id,
          label: c.users ? c.users.full_name : '',
          sub: c.users && c.users.phone ? c.users.phone : 'موكل',
        })),
      ]

      setResults(combined)
      setLoading(false)
    }, 350)
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3 px-4 py-3">
        <span className="text-slate-400">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="ابحث باسم الموكل، رقم القضية، رقم الهاتف..."
          className="flex-1 outline-none text-sm bg-transparent"
        />
        {loading && <span className="text-[10px] text-slate-300">جارٍ البحث...</span>}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 max-h-80 overflow-y-auto z-50">
          {results.length === 0 && !loading && (
            <p className="p-4 text-xs text-slate-400 text-center">لا توجد نتائج مطابقة.</p>
          )}
          {results.map((r) => (
            <Link
              key={r.kind + '-' + r.id}
              href={r.kind === 'case' ? '/manager/cases/' + r.id : '#'}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
            >
              <span className="text-lg">{r.kind === 'case' ? '📁' : '👤'}</span>
              <div>
                <p className="text-xs font-bold text-slate-800">{r.label}</p>
                <p className="text-[10px] text-slate-400">{r.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
