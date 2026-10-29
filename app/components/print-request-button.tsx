'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentScanner from './document-scanner'

/**
 * طلب طباعة — المسار السريع.
 *
 * المبدأ: لا شيء يقف بين الضغطة والإرسال إلا التصوير.
 *  - الكاميرا تفتح فور الضغط، بلا نموذج قبلها.
 *  - كل صفحة تبدأ رفعها لحظة التقاطها، فيكون الرفع منتهياً غالباً قبل
 *    أن يضغط المستخدم «إرسال».
 *  - النوع والموعد والملاحظة مطويّة واختيارية، تُترك فارغة بلا أثر.
 */

type Page = {
  id: string
  preview: string
  path: string
  status: 'uploading' | 'done' | 'error'
}

const DOC_TYPES = ['دعوى', 'طعن', 'ردّ', 'دفع', 'مذكّرة', 'عريضة']

export default function PrintRequestButton({
  caseId,
  caseLabel,
  className = '',
}: {
  caseId: string
  caseLabel?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const [details, setDetails] = useState(false)
  const [docType, setDocType] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const batchRef = useRef<string>('')
  const galleryRef = useRef<HTMLInputElement | null>(null)
  const uploadsRef = useRef<Map<string, Promise<void>>>(new Map())
  const counterRef = useRef(0)

  function start() {
    batchRef.current =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2)
    uploadsRef.current = new Map()
    counterRef.current = 0
    setPages([])
    setDocType(''); setNote(''); setDueDate('')
    setDetails(false); setError(''); setSent(false)
    setOpen(true)
  }

  /** امتداد الملف من نوعه أو اسمه — فصور المعرض ليست كلّها jpg */
  function extOf(file: File): string {
    const fromName = (file.name || '').split('.').pop()
    if (fromName && fromName.length <= 5 && /^[a-zA-Z0-9]+$/.test(fromName)) return fromName.toLowerCase()
    const t = (file.type || '').split('/').pop()
    return t && /^[a-zA-Z0-9]+$/.test(t) ? t.toLowerCase() : 'jpg'
  }

  /** الرفع يبدأ لحظة الالتقاط أو الاختيار، لا عند الإرسال */
  function addPage(file: File) {
    counterRef.current += 1
    const n = counterRef.current
    const id = String(n) + '-' + Date.now()
    const path =
      caseId + '/print/' + batchRef.current + '/' + String(n).padStart(2, '0') + '.' + extOf(file)

    setPages((prev) => [...prev, { id, preview: URL.createObjectURL(file), path, status: 'uploading' }])

    const supabase = createClient()
    const task = supabase.storage
      .from('case-documents')
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
      .then(({ error: upErr }) => {
        setPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: upErr ? 'error' : 'done' } : p))
        )
      })
      .catch(() => {
        setPages((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'error' } : p)))
      })

    uploadsRef.current.set(id, task)
  }

  function removePage(id: string) {
    uploadsRef.current.delete(id)
    setPages((prev) => prev.filter((p) => p.id !== id))
  }

  async function send() {
    setSending(true)
    setError('')

    // ننتظر ما لم يكتمل رفعه — وغالباً لم يبقَ شيء
    await Promise.allSettled(Array.from(uploadsRef.current.values()))

    const current = await new Promise<Page[]>((resolve) => {
      setPages((prev) => { resolve(prev); return prev })
    })

    const failed = current.filter((p) => p.status === 'error')
    if (failed.length > 0) {
      setError('تعذّر رفع ' + failed.length + ' صفحة. احذفها وأعد تصويرها، أو تحقّق من الشبكة.')
      setSending(false)
      return
    }

    const ready = current.filter((p) => p.status === 'done').map((p) => p.path)
    if (ready.length === 0) {
      setError('لم تُرفع أي صفحة بعد.')
      setSending(false)
      return
    }

    try {
      const res = await fetch('/api/print-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          pages: ready,
          docType: docType || null,
          note: note.trim() || null,
          dueDate: dueDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'تعذّر إرسال الطلب')
      } else {
        setSent(true)
        if (!data.assigned) {
          setError('أُرسل الطلب، لكن لا يوجد حساب طبّاع بعد — سيظهر له فور إنشائه.')
        }
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. الصور محفوظة، أعد المحاولة.')
    }
    setSending(false)
  }

  const uploading = pages.filter((p) => p.status === 'uploading').length

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={
          className ||
          'w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 active:scale-[.99] ' +
          'text-white font-bold text-sm rounded-2xl px-5 py-3.5 transition shadow-sm'
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </svg>
        طلب طباعة
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center sm:justify-center" dir="rtl">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-slate-900 text-sm">طلب طباعة</h3>
                {caseLabel && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{caseLabel}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg px-2 shrink-0">✕</button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">✓</div>
                <p className="font-bold text-slate-800 mt-4">أُرسل إلى الطبّاع</p>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  {pages.length} صفحة. وصله إشعار الآن.
                </p>
                {error && <p className="text-[12px] text-amber-700 mt-3 leading-relaxed">{error}</p>}
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 text-xs font-bold bg-slate-800 text-white px-6 py-2.5 rounded-xl"
                >
                  تم
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl px-4 py-3 leading-relaxed">
                    {error}
                  </div>
                )}

                {pages.length === 0 && (
                  <p className="text-slate-400 text-[13px] text-center py-3">
                    صوّر الأوراق صفحةً صفحة، ثم أرسلها.
                  </p>
                )}

                {pages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {pages.map((p, i) => (
                      <div key={p.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={p.preview} alt={'صفحة ' + (i + 1)} className="w-full h-full object-cover" />
                        <span className="absolute top-1 right-1 bg-slate-900/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {i + 1}
                        </span>
                        {p.status === 'uploading' && (
                          <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-[10px] text-slate-600">
                            جارٍ الرفع
                          </span>
                        )}
                        {p.status === 'error' && (
                          <span className="absolute inset-0 bg-red-50/85 flex items-center justify-center text-[10px] text-red-700">
                            تعذّر
                          </span>
                        )}
                        <button
                          onClick={() => removePage(p.id)}
                          aria-label={'حذف الصفحة ' + (i + 1)}
                          className="absolute bottom-1 left-1 bg-white/90 text-slate-600 rounded-full w-5 h-5 text-[11px] leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <DocumentScanner
                    onCapture={addPage}
                    autoOpen={pages.length === 0}
                    label={pages.length === 0 ? '📷 ابدأ التصوير' : '📷 صفحة أخرى'}
                  />

                  {/*
                    اختيار عدّة صور دفعةً واحدة من المعرض — لمن صوّر الأوراق
                    قبل أن يفتح النظام، أو أراد إرسال ما في هاتفه بلا إعادة تصوير.
                    وكلّها تدخل الطلب نفسه، فتصل الطبّاع ملفاً واحداً.
                  */}
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="text-xs font-bold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition w-full"
                  >
                    🖼️ من المعرض
                  </button>

                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const list = e.target.files
                      if (list) Array.from(list).forEach((f) => addPage(f))
                      e.target.value = ''
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setDetails(!details)}
                  className="text-[12px] text-slate-500 hover:text-slate-700 transition"
                >
                  {details ? 'إخفاء التفاصيل' : 'تفاصيل اختيارية (النوع، الموعد، ملاحظة)'}
                </button>

                {details && (
                  <div className="space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {DOC_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setDocType(docType === t ? '' : t)}
                          className={
                            'px-3 py-1.5 rounded-full text-[12px] font-bold border transition ' +
                            (docType === t
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/60"
                    />

                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="ملاحظة للطبّاع…"
                      className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/60 resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={send}
                  disabled={sending || pages.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl px-5 py-3.5 transition disabled:opacity-50"
                >
                  {sending
                    ? (uploading > 0 ? 'جارٍ رفع الصور…' : 'جارٍ الإرسال…')
                    : 'إرسال إلى الطبّاع' + (pages.length ? ' (' + pages.length + ')' : '')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
