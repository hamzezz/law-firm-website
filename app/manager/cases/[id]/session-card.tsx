'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import VoiceInput from '@/app/components/voice-input'
import DocumentScanner from '@/app/components/document-scanner'

/** الميلادي بأرقام إنجليزية: 25/10/2026 */
function gregorian(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return day + '/' + month + '/' + d.getFullYear()
}

/** الهجري بتقويم أم القرى صراحةً — لئلّا يختلف الخادم عن المتصفّح */
function hijriLong(d: Date) {
  try {
    return d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return ''
  }
}

/** الهجري الطويل كما تستعمله المحاكم، ثم الميلادي بجانبه */
function bothCalendars(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const hijri = hijriLong(d)
  return hijri ? hijri + ' — ' + gregorian(d) : gregorian(d)
}

function sessionStatusLabel(status: string) {
  const map: Record<string, string> = { scheduled: 'مجدولة', held: 'منعقدة', postponed: 'مؤجلة' }
  return map[status?.toLowerCase()] || status
}

export default function ManagerSessionCard({ session, caseId, caseNumber, clientName, uploadedBy, sessionDocs, isFuture }: any) {
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [locked, setLocked] = useState(session.is_locked)

  const sessionDateFormatted = bothCalendars(session.session_date)

  async function handleFinalSave() {
    if (!notes.trim()) {
      setMessage({ type: 'error', text: 'اكتب قرار الجلسة أولاً' })
      return
    }
    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()

      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = session.id + '-' + Date.now() + '.' + fileExt
        const filePath = caseId + '/' + fileName

        const uploadResult = await supabase.storage.from('case-documents').upload(filePath, file)

        if (uploadResult.error) {
          setMessage({ type: 'error', text: 'فشل رفع المحضر: ' + uploadResult.error.message })
          setSaving(false)
          return
        }

        const docResult = await supabase.from('documents').insert({
          case_id: caseId,
          session_id: session.id,
          file_name: file.name,
          storage_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: uploadedBy,
        })

        if (docResult.error) {
          setMessage({ type: 'error', text: 'فشل حفظ بيانات المحضر: ' + docResult.error.message })
          setSaving(false)
          return
        }
      }

      const updateResult = await supabase
        .from('sessions')
        .update({
          notes: notes.trim(),
          status: 'held',
          next_session_date: nextDate || null,
          is_locked: true,
        })
        .eq('id', session.id)

      if (updateResult.error) {
        setMessage({ type: 'error', text: 'فشل حفظ قرار الجلسة: ' + updateResult.error.message })
        setSaving(false)
        return
      }

      if (nextDate) {
        const insertResult = await supabase.from('sessions').insert({
          case_id: caseId,
          session_date: nextDate,
          title: 'الجلسة رقم ' + ((session.session_order || 0) + 1),
          status: 'scheduled',
          session_order: (session.session_order || 0) + 1,
        })
        if (insertResult.error) {
          setMessage({ type: 'error', text: 'تم حفظ القرار لكن فشل جدولة الجلسة القادمة: ' + insertResult.error.message })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'تم حفظ الجلسة بنجاح بشكل نهائي' })
      setLocked(true)
      setTimeout(function () { window.location.reload() }, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ غير متوقع أثناء الحفظ' })
    }
    setSaving(false)
  }

  /* ——— دائرة المسار الزمني على يمين البطاقة ——— */
  function Rail({ tone }: { tone: 'muted' | 'open' | 'done' }) {
    const cls =
      tone === 'done'
        ? 'bg-amber-500 text-white'
        : tone === 'open'
          ? 'bg-amber-400 text-white animate-pulse'
          : 'bg-slate-200 text-slate-400'
    return (
      <div className={'absolute right-0 top-4 w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-xs border-2 border-white shadow ' + cls}>
        {tone === 'muted' ? '🔒' : session.session_order}
      </div>
    )
  }

  /* ═══ 1) جلسة لم يحن وقتها، أو سابقتها لم تُسجَّل بعد ═══ */
  if (isFuture) {
    return (
      <div className="relative pr-10">
        <Rail tone="muted" />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-500 leading-snug">الجلسة رقم {session.session_order}</p>
            <span className="text-[11px] text-slate-400 shrink-0">{sessionStatusLabel(session.status)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            لا يمكن إضافة أي معلومات حول هذه الجلسة إلا في يوم انعقادها ({sessionDateFormatted}) أو بعده
          </p>
        </div>
      </div>
    )
  }

  /* ═══ 2) جلسة سُجّلت نهائياً — لا تُعدَّل ═══ */
  if (locked) {
    return (
      <div className="relative pr-10">
        <Rail tone="done" />
        <div className="rounded-xl border border-slate-200 border-r-[3px] border-r-amber-500 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-900 leading-snug">الجلسة رقم {session.session_order}</p>
            <span className="text-[11px] text-slate-500 shrink-0">{sessionStatusLabel(session.status)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{sessionDateFormatted}</p>

          <p className="text-sm text-slate-700 mt-3 leading-relaxed">{session.notes}</p>

          {session.next_session_date && (
            <p className="text-xs text-amber-700 font-bold mt-3">
              الجلسة القادمة: {gregorian(session.next_session_date)}
            </p>
          )}

          {sessionDocs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-slate-400 font-bold">المحاضر المرفقة</p>
              {sessionDocs.map(function (d: any) {
                const docUrl = d.url ? d.url : '#'
                return (
                  <a
                    key={d.id}
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-xs text-amber-700 hover:text-amber-900 py-1.5 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-4 h-4 shrink-0">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5" />
                    </svg>
                    <span className="truncate">{d.file_name}</span>
                  </a>
                )
              })}
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-3">بيانات هذه الجلسة نهائية ولا يمكن تعديلها</p>
        </div>
      </div>
    )
  }

  /* ═══ 3) جلسة اليوم — تُسجَّل مرة واحدة ═══ */
  return (
    <div className="relative pr-10">
      <Rail tone="open" />
      <div className="rounded-xl border border-amber-200 border-r-[3px] border-r-amber-500 bg-amber-50/40 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm text-slate-900 leading-snug">الجلسة رقم {session.session_order}</p>
          <span className="text-[11px] text-slate-500 shrink-0">{sessionStatusLabel(session.status)}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{sessionDateFormatted}</p>

        {message && (
          <div className={
            'text-xs p-2.5 rounded-lg mt-3 ' +
            (message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
          }>
            {message.text}
          </div>
        )}

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1.5">قرار الجلسة</label>
            <textarea
              placeholder="اكتب قرار الجلسة..."
              value={notes}
              onChange={function (e) { setNotes(e.target.value) }}
              disabled={saving}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 h-24 resize-none bg-white"
            />
            <div className="mt-2">
              <VoiceInput onTranscript={function (text) { setNotes(text) }} />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1.5">تاريخ الجلسة القادمة (اختياري)</label>
            <input
              type="date"
              value={nextDate}
              onChange={function (e) { setNextDate(e.target.value) }}
              disabled={saving}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-1.5">محضر الجلسة (اختياري)</label>
            <DocumentScanner onCapture={function (f) { setFile(f) }} />
            <label className="mt-2 flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 cursor-pointer hover:bg-slate-50 transition">
              اختيار ملف من الجهاز
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={function (e) { setFile(e.target.files ? e.target.files[0] : null) }}
                disabled={saving}
                className="hidden"
              />
            </label>
            {file && <p className="text-[11px] text-emerald-700 mt-2 truncate">✓ {file.name}</p>}
          </div>

          <button
            onClick={handleFinalSave}
            disabled={saving}
            className="w-full text-sm bg-amber-600 text-white px-4 py-3.5 rounded-xl hover:bg-amber-700 transition font-bold disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الجلسة نهائياً (القرار + المحضر)'}
          </button>
          <p className="text-[10px] text-slate-400 text-center">لا يمكن تعديل هذه البيانات بعد الحفظ</p>
        </div>
      </div>
    </div>
  )
}
