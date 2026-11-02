'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sessionTitleFor } from '@/lib/sessions/title'
import { sessionStatusLabel } from '@/lib/sessions/status'
import VoiceInput from '@/app/components/voice-input'
import DocumentScanner from '@/app/components/document-scanner'

/** التاريخ الميلادي بأرقام إنجليزية: 25/10/2026 */
function gregorian(d: Date) {
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


export default function SessionCard({ session, caseId, caseNumber, clientName, uploadedBy, sessionDocs, isFuture, caseClosed }: any) {
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [locked, setLocked] = useState(session.is_locked)

  /**
   * جلسات مجدولة أخرى لهذه القضية تصير بلا معنى بعد التأجيل.
   * لا تُحذف تلقائياً — تُعرض ويقرّر المستخدم، فقد يكون للقضية جلستان فعلاً.
   */
  const [orphans, setOrphans] = useState<any[]>([])
  const [cleaning, setCleaning] = useState(false)

  /**
   * القدوم من تنبيه «جلسات تنتظر القرار»: الرابط يحمل #session-<id>،
   * فننزل إلى البطاقة ونومضها. ولا نترك الأمر للمتصفّح وحده لأن الصفحة
   * تُبنى على الخادم وقد تصل البطاقة بعد قفزة المرساة.
   */
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [flash, setFlash] = useState(false)

  /** مسار «لم تُعقد»: مضى موعدها ولم تنعقد — عطلة أو إضراب أو غياب */
  const [notHeldOpen, setNotHeldOpen] = useState(false)
  const [notHeldReason, setNotHeldReason] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash !== '#session-' + session.id) return
    const t = setTimeout(() => {
      if (cardRef.current) cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlash(true)
      setTimeout(() => setFlash(false), 2400)
    }, 300)
    return () => clearTimeout(t)
  }, [session.id])

  const sessionDateFormatted = bothCalendars(session.session_date)

  async function removeOrphans() {
    setCleaning(true)
    try {
      const supabase = createClient()
      const ids = orphans.map((o: any) => o.id)
      const { error } = await supabase.from('sessions').delete().in('id', ids)
      if (error) {
        setMessage({ type: 'error', text: 'تعذّر إلغاء الجلسات: ' + error.message })
        setCleaning(false)
        return
      }
    } catch {
      setMessage({ type: 'error', text: 'تعذّر الاتصال بالخادم' })
      setCleaning(false)
      return
    }
    window.location.reload()
  }

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
        // لا نُنشئ جلسة ثانية لتاريخ جُدولت له جلسة من قبل (بوت المحكمة قد سبقنا إليها)
        const { data: already } = await supabase
          .from('sessions')
          .select('id')
          .eq('case_id', caseId)
          .eq('session_date', nextDate)
          .maybeSingle()

        const insertResult = already
          ? { error: null }
          : await supabase.from('sessions').insert({
              case_id: caseId,
              session_date: nextDate,
              title: sessionTitleFor(nextDate),
              status: 'scheduled',
            })
        if (insertResult.error) {
          setMessage({ type: 'error', text: 'تم حفظ القرار لكن فشل جدولة الجلسة القادمة: ' + insertResult.error.message })
          setSaving(false)
          return
        }
      }

      setLocked(true)

      /**
       * بعد التأجيل: هل بقيت للقضية جلسات مجدولة أخرى؟
       *
       * وقع هذا فعلاً — رُفع كشفان فأُنشئت جلستان لتاريخين، ثم عُقدت
       * إحداهما وأُجّلت القضية، فبقيت الأخرى مجدولةً تظهر في «جلسات
       * الغد» بلا جلسة حقيقية خلفها.
       */
      if (nextDate) {
        const { data: others } = await supabase
          .from('sessions')
          .select('id, session_date')
          .eq('case_id', caseId)
          .eq('status', 'scheduled')
          .neq('id', session.id)
          .neq('session_date', nextDate)

        if (others && others.length > 0) {
          setOrphans(others)
          setMessage({ type: 'success', text: 'حُفظ قرار الجلسة. وبقيت جلسات مجدولة تحتاج قرارك.' })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'تم حفظ الجلسة بنجاح بشكل نهائي' })
      setTimeout(function () { window.location.reload() }, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ غير متوقع أثناء الحفظ' })
    }
    setSaving(false)
  }

  /**
   * الجلسة لم تُعقد.
   *
   * كانت الحالات المتاحة اثنتين: «مجدولة» و«منعقدة». فجلسةٌ مضى موعدها
   * ولم تنعقد — عطلة أو إضراب أو غياب هيئة — لا موضعَ لها: تبقى مجدولةً
   * إلى الأبد في تنبيه «جلسات تنتظر تسجيل القرار»، أو تُسجَّل كأنها
   * عُقدت فيكذب السجلّ.
   *
   * والسبب مطلوب لا اختياري: جلسةٌ لم تُعقد بلا سببٍ مكتوب سجلٌّ ناقص،
   * ويُسأل عنه المحامي بعد سنة ولا يجد جواباً.
   */
  async function handleNotHeld() {
    const reason = notHeldReason.trim()

    if (reason.length < 3) {
      setMessage({ type: 'error', text: 'اكتب سبب عدم الانعقاد — لا تُسجَّل جلسة لم تُعقد بلا سبب' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const updateResult = await supabase
        .from('sessions')
        .update({
          notes: 'لم تُعقد — ' + reason,
          status: 'not_held',
          next_session_date: nextDate || null,
          is_locked: true,
        })
        .eq('id', session.id)

      if (updateResult.error) {
        setMessage({ type: 'error', text: 'فشل التسجيل: ' + updateResult.error.message })
        setSaving(false)
        return
      }

      // الجلسة البديلة، إن حُدِّد لها تاريخ — بنفس احتياط مسار حفظ القرار
      if (nextDate) {
        const { data: already } = await supabase
          .from('sessions')
          .select('id')
          .eq('case_id', caseId)
          .eq('session_date', nextDate)
          .maybeSingle()

        const insertResult = already
          ? { error: null }
          : await supabase.from('sessions').insert({
              case_id: caseId,
              session_date: nextDate,
              title: sessionTitleFor(nextDate),
              status: 'scheduled',
            })

        if (insertResult.error) {
          setMessage({ type: 'error', text: 'سُجّل عدم الانعقاد لكن فشل جدولة الجلسة البديلة: ' + insertResult.error.message })
          setSaving(false)
          return
        }
      }

      setLocked(true)

      // وجلساتٌ مجدولة أخرى بقيت؟ نفس فحص مسار حفظ القرار
      if (nextDate) {
        const { data: others } = await supabase
          .from('sessions')
          .select('id, session_date')
          .eq('case_id', caseId)
          .eq('status', 'scheduled')
          .neq('id', session.id)
          .neq('session_date', nextDate)

        if (others && others.length > 0) {
          setOrphans(others)
          setMessage({ type: 'success', text: 'سُجّل عدم الانعقاد. وبقيت جلسات مجدولة تحتاج قرارك.' })
          setSaving(false)
          return
        }
      }

      setMessage({ type: 'success', text: 'سُجّل أن الجلسة لم تُعقد.' })
      setTimeout(function () { window.location.reload() }, 1200)
    } catch (err) {
      setMessage({ type: 'error', text: 'حدث خطأ غير متوقع' })
    }
    setSaving(false)
  }

  /* ——— رقم الجلسة في دائرة، يتلوّن بحالتها ——— */
  function Num({ tone }: { tone: 'muted' | 'open' | 'done' }) {
    const cls =
      tone === 'done'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'open'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-400'
    return (
      <span className={'w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-display font-bold text-xs ' + cls}>
        {session.displayOrder || session.session_order}
      </span>
    )
  }

  /* ═══ 0) القضية مغلقة — سجلّ لا يُكتب فيه ═══ */
  if (caseClosed && !locked) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
        <Num tone="muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-500 leading-snug">الجلسة رقم {session.displayOrder || session.session_order}</p>
            <span className="text-[11px] text-slate-400 shrink-0">{sessionStatusLabel(session.status)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{sessionDateFormatted}</p>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            القضية مغلقة — لا يمكن تسجيل بيانات جديدة
          </p>
        </div>
      </div>
    )
  }

  /* ═══ 1) جلسة لم يحن وقتها، أو سابقتها لم تُسجَّل بعد ═══ */
  if (isFuture) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
        <Num tone="muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-500 leading-snug">الجلسة رقم {session.displayOrder || session.session_order}</p>
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
      <div className="rounded-xl border border-slate-200 border-r-[3px] border-r-emerald-500 bg-white p-4 flex items-start gap-3">
        <Num tone="done" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-900 leading-snug">الجلسة رقم {session.displayOrder || session.session_order}</p>
            <span className="text-[11px] text-slate-500 shrink-0">{sessionStatusLabel(session.status)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{sessionDateFormatted}</p>

          <p className="text-sm text-slate-700 mt-3 leading-relaxed">{session.notes}</p>

          {session.next_session_date && (
            <p className="text-xs text-emerald-700 font-bold mt-3">
              الجلسة القادمة: {gregorian(new Date(session.next_session_date))}
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
                    className="flex items-center gap-2.5 text-xs text-emerald-700 hover:text-emerald-900 py-1.5 transition"
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
    <div ref={cardRef} id={'session-' + session.id}
         className={'rounded-xl border border-amber-200 border-r-[3px] border-r-amber-500 bg-amber-50/40 p-4 scroll-mt-28 transition ' + (flash ? 'ring-4 ring-emerald-400/70' : '')}>
      <div className="flex items-start gap-3">
        <Num tone="open" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-slate-900 leading-snug">الجلسة رقم {session.displayOrder || session.session_order}</p>
            <span className="text-[11px] text-slate-500 shrink-0">{sessionStatusLabel(session.status)}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{sessionDateFormatted}</p>
        </div>
      </div>

      {message && (
        <div className={
          'text-xs p-2.5 rounded-lg mt-3 ' +
          (message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')
        }>
          {message.text}
        </div>
      )}

      {orphans.length > 0 && (
        <div className="mt-3 border border-amber-300 bg-amber-50 rounded-xl p-3">
          <p className="text-[12px] font-bold text-amber-900">
            {orphans.length === 1 ? 'لهذه القضية جلسة مجدولة أخرى:' : 'لهذه القضية جلسات مجدولة أخرى:'}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {orphans.map((o: any) => (
              <li key={o.id} className="text-[12px] text-amber-900">— {gregorian(o.session_date)}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-800 mt-2 leading-relaxed">
            إن كانت القضية قد أُجّلت فهذه لم تعد قائمة، وستظهر في «جلسات الغد» بلا جلسة حقيقية خلفها.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={removeOrphans} disabled={cleaning}
                    className="text-[12px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50">
              {cleaning ? '...' : 'ألغِها'}
            </button>
            <button onClick={() => window.location.reload()} disabled={cleaning}
                    className="text-[12px] text-amber-800 font-bold px-3 py-1.5">
              اتركها
            </button>
          </div>
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
        {/*
          مخرجٌ ثالث للجلسة: لم تُعقد.
          كان أمام المستخدم طريقان فقط — يسجّل قراراً لم يصدر، أو يتركها
          مجدولةً إلى الأبد في تنبيه «تنتظر تسجيل القرار».
        */}
        {!notHeldOpen && (
          <button
            onClick={function () { setNotHeldOpen(true); setMessage(null) }}
            disabled={saving}
            className="w-full text-[12px] text-slate-500 hover:text-slate-800 py-2 font-bold transition disabled:opacity-50"
          >
            الجلسة لم تُعقد
          </button>
        )}

        {notHeldOpen && (
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2.5">
            <p className="text-[12px] font-bold text-slate-700">الجلسة لم تُعقد</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              تُسجَّل الجلسة «لم تُعقد» فتخرج من قائمة ما ينتظر قراراً، ويبقى سببها في السجلّ.
              وإن كان للمحكمة موعدٌ بديل فاكتبه في حقل «تاريخ الجلسة القادمة» أعلاه.
            </p>
            <textarea
              placeholder="سبب عدم الانعقاد — عطلة، إضراب، غياب هيئة، تعذّر إحضار..."
              value={notHeldReason}
              onChange={function (e) { setNotHeldReason(e.target.value) }}
              disabled={saving}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-400 h-16 resize-none bg-white"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleNotHeld}
                disabled={saving}
                className="flex-1 text-[12px] bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? '...' : 'تسجيل أنها لم تُعقد'}
              </button>
              <button
                onClick={function () { setNotHeldOpen(false); setNotHeldReason(''); setMessage(null) }}
                disabled={saving}
                className="text-[12px] text-slate-500 font-bold px-3 py-2.5"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
