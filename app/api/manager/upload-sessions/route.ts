import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { parseSessionsReport, deduplicateCases, normalizeArabic } from '@/lib/moj-parser/parser'
import { sendPushToUser } from '@/lib/push/send-push'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function getArabicDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return ARABIC_DAYS[date.getDay()]
}

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager' || appUser.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير التقني فقط' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'لم يتم إرفاق أي ملف' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const tempPath = path.join(os.tmpdir(), 'moj-upload-' + Date.now() + '.pdf')
  let fullText = ''

  try {
    await writeFile(tempPath, buffer)
    const { stdout } = await execFileAsync('pdftotext', ['-layout', tempPath, '-'], {
      maxBuffer: 1024 * 1024 * 50,
    })
    fullText = stdout
  } catch (err) {
    return NextResponse.json(
      { error: 'فشل استخراج نص الملف: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 400 }
    )
  } finally {
    try {
      await unlink(tempPath)
    } catch {
      // تجاهل
    }
  }

  const extractedRaw = parseSessionsReport(fullText)
  const extracted = deduplicateCases(extractedRaw)

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const uniqueCourts = Array.from(new Set(extracted.map((c) => c.courtName)))
  for (const courtName of uniqueCourts) {
    if (courtName !== 'غير محدد') {
      await admin.from('yemen_courts').insert({ name: courtName }).select().maybeSingle()
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10)
  const dayName = getArabicDayName(tomorrowStr)

  const { data: allManagers } = await admin
    .from('users')
    .select('id')
    .eq('role', 'manager')

  const matchedCases: any[] = []

  for (const item of extracted) {
    // نجلب كل القضايا بنفس رقم القضية، ثم نطابق اسم المحكمة بعد التطبيع
    const { data: candidateCases } = await admin
      .from('cases')
      .select('id, title, case_number, court_name, primary_lawyer_id, client_id')
      .eq('case_number', item.caseNumber)

    const normalizedFileCourtName = normalizeArabic(item.courtName)
    const matchedCase = (candidateCases || []).find(
      (c) => normalizeArabic(c.court_name || '') === normalizedFileCourtName
    )

    if (!matchedCase) continue

    const { data: existingSession } = await admin
      .from('sessions')
      .select('id')
      .eq('case_id', matchedCase.id)
      .eq('session_date', today)
      .maybeSingle()

    let sessionId: string

    if (existingSession) {
      sessionId = existingSession.id
    } else {
      const { data: newSession } = await admin
        .from('sessions')
        .insert({
          case_id: matchedCase.id,
          session_date: today,
          title: 'جلسة اليوم (من تقرير وزارة العدل)',
          status: 'scheduled',
          session_order: 1,
        })
        .select('id')
        .single()

      sessionId = newSession ? newSession.id : ''
    }

    let clientName = 'غير محدد'
    const { data: clientRow } = await admin
      .from('clients')
      .select('user_id')
      .eq('id', matchedCase.client_id)
      .single()
    if (clientRow) {
      const { data: clientUser } = await admin
        .from('users')
        .select('full_name')
        .eq('id', clientRow.user_id)
        .single()
      if (clientUser) clientName = clientUser.full_name
    }

    const notificationTitle = 'جلسة يوم غداً ' + dayName + ' - قضية الموكل ' + clientName
    const notificationBody =
      matchedCase.title +
      '\nقضية رقم ' + matchedCase.case_number +
      ' في محكمة ' + matchedCase.court_name

    const recipientUserIds: string[] = []

    if (matchedCase.primary_lawyer_id) {
      const { data: lawyerRow } = await admin
        .from('lawyers')
        .select('user_id')
        .eq('id', matchedCase.primary_lawyer_id)
        .single()
      if (lawyerRow) recipientUserIds.push(lawyerRow.user_id)
    } else {
      const { data: allLawyers } = await admin.from('lawyers').select('user_id')
      if (allLawyers) {
        for (const lawyer of allLawyers) recipientUserIds.push(lawyer.user_id)
      }
    }

    if (allManagers) {
      for (const manager of allManagers) recipientUserIds.push(manager.id)
    }

    const caseUrl = '/lawyer/cases/' + matchedCase.id

    for (const recipientId of recipientUserIds) {
      await admin.from('notifications').insert({
        recipient_user_id: recipientId,
        case_id: matchedCase.id,
        type: 'session_today',
        title: notificationTitle,
        body: notificationBody,
      })

      // إرسال Push Notification فعلي (بالخلفية، حتى لو الموقع مغلق)
      await sendPushToUser(admin, recipientId, notificationTitle, notificationBody, caseUrl)
    }

    matchedCases.push({
      caseNumber: matchedCase.case_number,
      courtName: matchedCase.court_name,
      title: matchedCase.title,
      clientName,
      sessionId,
    })
  }

  return NextResponse.json({
    success: true,
    totalExtracted: extracted.length,
    totalMatched: matchedCases.length,
    matchedCases,
  })
}
