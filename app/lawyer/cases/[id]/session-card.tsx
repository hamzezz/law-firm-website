'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function sessionStatusLabel(status: string) {
  const map: Record<string, string> = { scheduled: 'مجدولة', held: 'منعقدة', postponed: 'مؤجلة' }
  return map[status?.toLowerCase()] || status
}

export default function SessionCard({ session, caseId, caseNumber, clientName, uploadedBy, sessionDocs, isFuture }: any) {
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [locked, setLocked] = useState(session.is_locked)

  const sessionDateFormatted = new Date(session.session_date).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

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

  if (isFuture) {
    return (
      <div className="border-r-4 border-slate-300 bg-slate-100 rounded-lg p-4 opacity-70">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-sm text-slate-500">الجلسة رقم {session.session_order} - {caseNumber}</h3>
          <span className="text-xs text-slate-400">{sessionStatusLabel(session.status)}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">الموكل: {clientName}</p>
        <p className="text-xs text-slate-400 mt-2">لا يمكن إضافة أي معلومات حول هذه الجلسة إلا في يوم انعقادها ({sessionDateFormatted}) أو بعده</p>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="border-r-4 border-emerald-500 bg-slate-50 rounded-lg p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-sm text-slate-900">الجلسة رقم {session.session_order} - {caseNumber}</h3>
          <span className="text-xs text-slate-500">{sessionStatusLabel(session.status)}</span>
        </div>
        <p className="text-xs text-slate-500 mb-2">الموكل: {clientName} - {sessionDateFormatted}</p>
        <p className="text-sm text-slate-700 mb-2">{session.notes}</p>
        {session.next_session_date && (
          <p className="text-xs text-emerald-700 font-bold mb-3">تاريخ الجلسة القادمة: {new Date(session.next_session_date).toLocaleDateString('ar-SA')}</p>
        )}
        {sessionDocs.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-bold mb-1">المحاضر المرفقة</p>
            {sessionDocs.map(function (d: any) {
              const docUrl = d.url ? d.url : '#'
              return (
                <a key={d.id} href={docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-900 hover:underline transition">
                  <span>📄</span>
                  <span>{d.file_name}</span>
                </a>
              )
            })}
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-2">بيانات هذه الجلسة نهائية ولا يمكن تعديلها</p>
      </div>
    )
  }

  return (
    <div className="border-r-4 border-amber-500 bg-amber-50/40 rounded-lg p-4">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-sm text-slate-900">الجلسة رقم {session.session_order} - {caseNumber}</h3>
        <span className="text-xs text-slate-500">{sessionStatusLabel(session.status)}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">الموكل: {clientName} - {sessionDateFormatted}</p>

      {message && (
        <div className={message.type === 'success' ? 'text-xs p-2 rounded-lg mb-3 bg-emerald-50 text-emerald-700' : 'text-xs p-2 rounded-lg mb-3 bg-red-50 text-red-700'}>
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <textarea placeholder="اكتب قرار الجلسة..." value={notes} onChange={function (e) { setNotes(e.target.value) }} disabled={saving} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 h-20 resize-none bg-white" />

        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs text-slate-500 whitespace-nowrap">تاريخ الجلسة القادمة (اختياري):</label>
          <input type="date" value={nextDate} onChange={function (e) { setNextDate(e.target.value) }} disabled={saving} className="px-3 py-1 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">محضر الجلسة (اختياري):</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={function (e) { setFile(e.target.files ? e.target.files[0] : null) }} disabled={saving} className="text-xs w-full" />
        </div>

        <button onClick={handleFinalSave} disabled={saving} className="text-xs bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 transition font-bold disabled:opacity-50 w-full">
          {saving ? 'جارٍ الحفظ...' : 'حفظ الجلسة نهائياً (القرار + المحضر)'}
        </button>
        <p className="text-[10px] text-slate-400 text-center">لا يمكن تعديل هذه البيانات بعد الحفظ</p>
      </div>
    </div>
  )
}
