'use client'

import { useState } from 'react'

type Draft = { id: string; draft_no: number; word_path: string | null; pdf_path: string | null }
type Note = { id: string; body: string; is_resolved: boolean }
type Page = { id: string; page_order: number }

export type CasePrintRequest = {
  id: string
  docType: string
  note: string
  dueDate: string | null
  status: string
  createdAt: string
  pages: Page[]
  drafts: Draft[]
  notes: Note[]
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: 'عند الطبّاع',      cls: 'bg-amber-100 text-amber-800' },
  typing:    { label: 'قيد الطباعة',      cls: 'bg-blue-100 text-blue-800' },
  review:    { label: 'بانتظار مراجعتك',  cls: 'bg-violet-100 text-violet-800' },
  approved:  { label: 'معتمد',            cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغى',             cls: 'bg-slate-200 text-slate-600' },
}

function fmt(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return String(d.getDate()).padStart(2, '0') + '/' +
         String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}

function RequestRow({ r }: { r: CasePrintRequest }) {
  const [noteText, setNoteText] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [addedNotes, setAddedNotes] = useState<string[]>([])
  const [approved, setApproved] = useState(r.status === 'approved')

  const st = STATUS[approved ? 'approved' : r.status] || STATUS.new
  const latest = r.drafts.length > 0 ? r.drafts[r.drafts.length - 1] : null

  async function addNote() {
    if (!noteText.trim()) return
    setBusy('note'); setError(''); setMsg('')
    try {
      const res = await fetch('/api/print-requests/' + r.id + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteText.trim(), draftId: latest?.id || null }),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error || 'تعذّر إرسال الملاحظة')
      else {
        setAddedNotes((p) => [...p, noteText.trim()])
        setNoteText('')
        setMsg('أُرسلت الملاحظة إلى الطبّاع')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setBusy('')
  }

  async function approve(draftId: string) {
    setBusy('approve'); setError(''); setMsg('')
    try {
      const res = await fetch('/api/print-requests/' + r.id + '/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      })
      const data = await res.json()
      if (!res.ok) setError(data?.error || 'تعذّر الاعتماد')
      else {
        setApproved(true)
        setMsg('اعتُمدت، وحُفظت في مستندات القضية')
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setBusy('')
  }

  const notes = [...r.notes.map((n) => n.body), ...addedNotes]

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{r.docType}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {r.pages.length} صفحة مرسلة · {fmt(r.createdAt)}
            {r.dueDate ? ' · المطلوب قبل ' + fmt(r.dueDate) : ''}
          </p>
          {r.note && <p className="text-[12px] text-slate-600 mt-1.5">{r.note}</p>}
        </div>
        <span className={'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ' + st.cls}>
          {st.label}
        </span>
      </div>

      {r.pages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.pages.map((p) => (
            <a key={p.id} href={'/api/print-pages/' + p.id} target="_blank" rel="noreferrer"
               className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-[11px] font-bold text-slate-600">
              صفحة {p.page_order}
            </a>
          ))}
        </div>
      )}

      {r.drafts.length > 0 && (
        <div className="mt-4 space-y-2">
          {r.drafts.map((d) => (
            <div key={d.id} className="flex items-center flex-wrap gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
              <span className="text-[12px] font-bold text-slate-700">مسودّة {d.draft_no}</span>
              {d.word_path && (
                <a href={'/api/print-drafts/' + d.id + '?f=word'} target="_blank" rel="noreferrer"
                   className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold hover:bg-blue-100 transition">
                  Word
                </a>
              )}
              {d.pdf_path && (
                <a href={'/api/print-drafts/' + d.id + '?f=pdf'} target="_blank" rel="noreferrer"
                   className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[11px] font-bold hover:bg-red-100 transition">
                  PDF
                </a>
              )}
              {!approved && (
                <button
                  onClick={() => approve(d.id)}
                  disabled={busy !== ''}
                  className="mr-auto px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {busy === 'approve' ? '…' : 'اعتماد'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[12px] text-slate-600 leading-relaxed">{n}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[12px] text-red-700 mt-2">{error}</p>}
      {msg && !error && <p className="text-[12px] text-emerald-700 mt-2 font-bold">{msg}</p>}

      {!approved && (
        <div className="mt-3 flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="ملاحظة للطبّاع…"
            className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/60"
          />
          <button
            onClick={addNote}
            disabled={busy !== '' || !noteText.trim()}
            className="shrink-0 px-4 rounded-xl bg-slate-800 text-white text-[12px] font-bold disabled:opacity-50"
          >
            إرسال
          </button>
        </div>
      )}
    </div>
  )
}

export default function PrintRequests({ requests }: { requests: CasePrintRequest[] }) {
  if (!requests || requests.length === 0) return null

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-sm">طلبات الطباعة</h3>
        <span className="text-[12px] text-slate-400">{requests.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {requests.map((r) => <RequestRow key={r.id} r={r} />)}
      </div>
    </section>
  )
}
