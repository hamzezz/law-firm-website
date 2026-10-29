'use client'

import { useRef, useState } from 'react'

type Draft = { id: string; draft_no: number; word_path: string | null; pdf_path: string | null }
type Note = { id: string; body: string; is_resolved: boolean; draft_id: string | null }
type Page = { id: string; page_order: number }

export type TypistRequest = {
  id: string
  docType: string
  note: string
  dueDate: string | null
  status: string
  caseNumber: string
  caseTitle: string
  courtName: string
  otherParty: string
  pages: Page[]
  drafts: Draft[]
  notes: Note[]
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new:       { label: 'وارد',             cls: 'bg-amber-100 text-amber-800' },
  typing:    { label: 'قيد الطباعة',      cls: 'bg-blue-100 text-blue-800' },
  review:    { label: 'بانتظار المراجعة', cls: 'bg-violet-100 text-violet-800' },
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

export default function RequestCard({ request }: { request: TypistRequest }) {
  const r = request
  const [word, setWord] = useState<File | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [resolved, setResolved] = useState<string[]>([])

  const wordRef = useRef<HTMLInputElement | null>(null)
  const pdfRef = useRef<HTMLInputElement | null>(null)

  const st = STATUS[r.status] || STATUS.new
  const openNotes = r.notes.filter((n) => !n.is_resolved && resolved.indexOf(n.id) === -1)
  const locked = r.status === 'approved'

  async function upload() {
    if (!word && !pdf) return
    setBusy(true); setError('')
    try {
      const form = new FormData()
      if (word) form.append('word', word)
      if (pdf) form.append('pdf', pdf)

      const res = await fetch('/api/print-requests/' + r.id + '/draft', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setError(data?.error || 'تعذّر الرفع')
      else {
        setSent(true)
        setWord(null); setPdf(null)
        if (wordRef.current) wordRef.current.value = ''
        if (pdfRef.current) pdfRef.current.value = ''
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setBusy(false)
  }

  async function resolveNote(noteId: string) {
    setResolved((p) => [...p, noteId])
    try {
      await fetch('/api/print-requests/' + r.id + '/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', noteId }),
      })
    } catch {
      setResolved((p) => p.filter((x) => x !== noteId))
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{r.docType}</p>
          <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
            {r.caseTitle}{r.caseNumber ? ' — ' + r.caseNumber : ''}
          </p>
          {r.courtName && <p className="text-[11px] text-slate-400 mt-0.5">{r.courtName}</p>}
          {r.otherParty && <p className="text-[11px] text-slate-400 mt-0.5">الطرف الآخر: {r.otherParty}</p>}
          {r.note && (
            <p className="text-[12px] text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
              {r.note}
            </p>
          )}
        </div>
        <span className={'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ' + st.cls}>
          {st.label}
        </span>
      </div>

      {r.pages.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-slate-400 mb-1.5">الأوراق المرسلة — {r.pages.length} صفحة</p>
          <div className="flex flex-wrap gap-1.5">
            {r.pages.map((p) => (
              <a key={p.id} href={'/api/print-pages/' + p.id} target="_blank" rel="noreferrer"
                 className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 transition text-[12px] font-bold text-slate-700">
                صفحة {p.page_order}
              </a>
            ))}
          </div>
        </div>
      )}

      {r.dueDate && <p className="text-[11px] text-amber-700 mt-2.5">المطلوب قبل {fmt(r.dueDate)}</p>}

      {/* ملاحظات المدير — ما لم يُعالَج منها أولاً */}
      {openNotes.length > 0 && (
        <div className="mt-4 border border-amber-200 bg-amber-50/60 rounded-xl p-3 space-y-2">
          <p className="text-[11px] font-bold text-amber-800">ملاحظات على المسودّة</p>
          {openNotes.map((n, i) => (
            <div key={n.id} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[12px] text-slate-700 leading-relaxed flex-1">{n.body}</p>
              <button onClick={() => resolveNote(n.id)}
                      className="shrink-0 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition">
                عولجت
              </button>
            </div>
          ))}
        </div>
      )}

      {/* المسودّات المرفوعة */}
      {r.drafts.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-slate-400 mb-1.5">المسودّات</p>
          <div className="space-y-1.5">
            {r.drafts.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-[12px]">
                <span className="text-slate-600 font-bold">مسودّة {d.draft_no}</span>
                {d.word_path && (
                  <a href={'/api/print-drafts/' + d.id + '?f=word'} target="_blank" rel="noreferrer"
                     className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition">
                    Word
                  </a>
                )}
                {d.pdf_path && (
                  <a href={'/api/print-drafts/' + d.id + '?f=pdf'} target="_blank" rel="noreferrer"
                     className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold hover:bg-red-100 transition">
                    PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* رفع مسودّة */}
      {!locked && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {sent ? (
            <p className="text-[13px] text-emerald-700 font-bold">
              رُفعت المسودّة ووصل المدير تنبيهها. حدّث الصفحة لرؤيتها.
            </p>
          ) : (
            <>
              {error && <p className="text-[12px] text-red-700 mb-2">{error}</p>}
              <p className="text-[11px] text-slate-400 mb-2">ارفع المسودّة — Word أو PDF أو كليهما</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[12px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-300 transition truncate">
                  <input ref={wordRef} type="file" accept=".doc,.docx" className="hidden"
                         onChange={(e) => setWord(e.target.files?.[0] || null)} />
                  {word ? '📄 ' + word.name : '📄 اختر Word'}
                </label>
                <label className="text-[12px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:border-slate-300 transition truncate">
                  <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
                         onChange={(e) => setPdf(e.target.files?.[0] || null)} />
                  {pdf ? '📕 ' + pdf.name : '📕 اختر PDF'}
                </label>
              </div>
              <button onClick={upload} disabled={busy || (!word && !pdf)}
                      className="mt-2.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl px-5 py-2.5 transition disabled:opacity-50">
                {busy ? 'جارٍ الرفع…' : 'رفع المسودّة'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
