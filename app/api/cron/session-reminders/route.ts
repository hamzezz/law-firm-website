import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push/send-push'
import { logAudit } from '@/lib/audit/log'

export const dynamic = 'force-dynamic'

/**
 * التذكير الليلي — يُستدعى من pg_cron عبر pg_net الساعة ١٠ مساءً بتوقيت اليمن.
 *
 * شيئان في نداء واحد:
 *   ١) جلسات الغد — رسالة واحدة مجمَّعة لكل شخص، بنبرة هادئة.
 *   ٢) المواعيد الحرجة — رسالة لكل موعد، بنبرة صارمة، على أربع مراحل
 *      متصاعدة (٧ أيام، ٣، يوم، اليوم).
 *
 * ولماذا هنا لا في قاعدة البيانات: قاعدة البيانات تكتب صفّاً في جدول
 * الإشعارات ولا تستطيع إرسال Web Push ولا FCM. فيبقى التذكير نائماً في
 * الجرس حتى يفتحه المحامي — وهذا ليس تذكيراً.
 */

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const ADEN_OFFSET_MS = 3 * 60 * 60 * 1000

function adenToday(): string {
  return new Date(Date.now() + ADEN_OFFSET_MS).toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function dayName(dateStr: string): string {
  return ARABIC_DAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()]
}

function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return d + '/' + m + '/' + y
}

/** فرق الأيام بين موعد واليوم، بالتقويم لا بالساعات */
function daysUntil(dateStr: string, today: string): number {
  const a = new Date(dateStr + 'T00:00:00Z').getTime()
  const b = new Date(today + 'T00:00:00Z').getTime()
  return Math.round((a - b) / 86400000)
}

/** المرحلة التي يستحقّها الموعد الآن. تتحمّل فوات يوم: ٤ أيام متبقية تقع في مرحلة ٧ */
function deadlineStage(daysLeft: number): number | null {
  if (daysLeft <= 0) return 0
  if (daysLeft <= 1) return 1
  if (daysLeft <= 3) return 3
  if (daysLeft <= 7) return 7
  return null
}

function stagePrefix(stage: number, daysLeft: number): string {
  if (stage === 0) return daysLeft < 0 ? '🔴 موعد حرج فات موعده' : '🔴 موعد حرج اليوم'
  if (stage === 1) return '🔴 موعد حرج غداً — تبقّى يوم واحد'
  if (stage === 3) return '⚠️ موعد حرج بعد ثلاثة أيام'
  return '⏰ موعد حرج بعد أسبوع'
}

type Line = { text: string }

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = process.env.CRON_SECRET || ''

  // بلا سرّ مضبوط لا يعمل المسار إطلاقاً — خير من أن يكون مفتوحاً للعالم
  if (!secret || url.searchParams.get('s') !== secret) {
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = adenToday()
  const tomorrow = addDays(today, 1)

  // حارس التكرار: لو نُفّذ النداء مرتين في الليلة نفسها لم نُزعج أحداً مرتين
  const { data: recent } = await admin
    .from('notifications')
    .select('id')
    .eq('type', 'session_reminder')
    .gte('created_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json({ ok: true, skipped: 'أُرسل تذكير خلال الاثنتي عشرة ساعة الماضية' })
  }

  /* ═══════════ من هم المديرون والمحامون ═══════════ */

  const [managersRes, lawyersRes] = await Promise.all([
    admin.from('users').select('id').eq('role', 'manager'),
    admin.from('lawyers').select('id, user_id'),
  ])

  const managerIds = (managersRes.data || []).map((m: any) => m.id)
  const lawyerRows = lawyersRes.data || []
  const lawyerUserById: Record<string, string> = {}
  lawyerRows.forEach((l: any) => { lawyerUserById[l.id] = l.user_id })

  /* ═══════════ ١) جلسات الغد ═══════════ */

  const { data: tomorrowSessions } = await admin
    .from('sessions')
    .select('id, case_id, session_date')
    .gte('session_date', tomorrow)
    .lt('session_date', addDays(tomorrow, 1))

  const sessionCaseIds = Array.from(
    new Set((tomorrowSessions || []).map((s: any) => s.case_id).filter(Boolean))
  )

  // سطور الرسالة، مجمّعة لكل مستقبِل على حدة.
  // والتجميع هو ما يمنع تسرّب بيانات موكّل إلى رسالة موكّل آخر.
  const linesByUser: Record<string, Line[]> = {}

  function addLine(userId: string, text: string) {
    if (!userId) return
    if (!linesByUser[userId]) linesByUser[userId] = []
    if (!linesByUser[userId].some((l) => l.text === text)) {
      linesByUser[userId].push({ text })
    }
  }

  if (sessionCaseIds.length > 0) {
    const { data: caseRows } = await admin
      .from('cases')
      .select('id, case_number, title, court_name, primary_lawyer_id, client_id')
      .in('id', sessionCaseIds)
      .neq('status', 'closed')

    const cases = caseRows || []
    const caseIds = cases.map((c: any) => c.id)

    const [accessRes, clientsRes] = await Promise.all([
      admin.from('case_lawyer_access').select('case_id, lawyer_id').in('case_id', caseIds),
      admin
        .from('clients')
        .select('id, user_id')
        .in('id', Array.from(new Set(cases.map((c: any) => c.client_id).filter(Boolean)))),
    ])

    const accessByCase: Record<string, string[]> = {}
    ;(accessRes.data || []).forEach((a: any) => {
      if (!accessByCase[a.case_id]) accessByCase[a.case_id] = []
      accessByCase[a.case_id].push(a.lawyer_id)
    })

    const clientUserById: Record<string, string> = {}
    ;(clientsRes.data || []).forEach((c: any) => { clientUserById[c.id] = c.user_id })

    // أسماء الموكّلين، لتظهر في رسالة المحامي والمدير
    const clientUserIds = Object.values(clientUserById)
    const { data: clientUsers } = clientUserIds.length > 0
      ? await admin.from('users').select('id, full_name').in('id', clientUserIds)
      : { data: [] as any[] }

    const nameByUserId: Record<string, string> = {}
    ;(clientUsers || []).forEach((u: any) => { nameByUserId[u.id] = u.full_name })

    for (const c of cases) {
      const clientUserId = clientUserById[c.client_id] || ''
      const clientName = nameByUserId[clientUserId] || 'موكّل'
      const court = c.court_name ? ' — ' + c.court_name : ''

      const staffLine = '• ' + (c.case_number || '') + ' — ' + clientName + court
      const clientLine = '• قضية ' + (c.case_number || '') + court

      // المحامون: الأساسي ومن له صلاحية. والقضية غير المسندة يراها الجميع.
      if (c.primary_lawyer_id) {
        addLine(lawyerUserById[c.primary_lawyer_id], staffLine)
        for (const lid of accessByCase[c.id] || []) addLine(lawyerUserById[lid], staffLine)
      } else {
        for (const l of lawyerRows) addLine(l.user_id, staffLine)
      }

      // الموكّل — لا يرى في رسالته إلا قضاياه
      if (clientUserId) addLine(clientUserId, clientLine)

      // المديرون
      for (const mid of managerIds) addLine(mid, staffLine)
    }
  }

  const reminderTitle = 'جلسات الغد — ' + dayName(tomorrow) + ' ' + prettyDate(tomorrow)
  let sessionsSent = 0

  for (const userId of Object.keys(linesByUser)) {
    const lines = linesByUser[userId]
    const count = lines.length
    const header =
      count === 1 ? 'لديك جلسة واحدة غداً:' : 'لديك ' + count + ' جلسات غداً:'
    const body = header + '\n' + lines.map((l) => l.text).join('\n')

    const { data: notifRow } = await admin
      .from('notifications')
      .insert({
        recipient_user_id: userId,
        type: 'session_reminder',
        title: reminderTitle,
        body,
      })
      .select('id')
      .single()

    await sendPushToUser(admin, userId, reminderTitle, body, '/portal.html', notifRow?.id || '')
    sessionsSent++
  }

  /* ═══════════ ٢) المواعيد الحرجة ═══════════ */

  const { data: deadlines } = await admin
    .from('critical_deadlines')
    .select('id, case_id, deadline_type, description, deadline_date, last_reminded_stage')
    .eq('is_resolved', false)
    .lte('deadline_date', addDays(today, 7))

  let deadlinesSent = 0

  for (const d of deadlines || []) {
    const dateStr = String(d.deadline_date).slice(0, 10)
    const left = daysUntil(dateStr, today)
    const stage = deadlineStage(left)

    if (stage === null) continue

    // لا نُرسل إلا عند التصعيد: من مرحلة ٧ إلى ٣ إلى ١ إلى ٠
    const previous = d.last_reminded_stage
    if (previous !== null && previous !== undefined && previous <= stage) continue

    const { data: caseRow } = await admin
      .from('cases')
      .select('id, case_number, title, primary_lawyer_id, status')
      .eq('id', d.case_id)
      .maybeSingle()

    if (!caseRow || caseRow.status === 'closed') continue

    const { data: access } = await admin
      .from('case_lawyer_access')
      .select('lawyer_id')
      .eq('case_id', d.case_id)

    const targets = new Set<string>()
    if (caseRow.primary_lawyer_id) {
      const uid = lawyerUserById[caseRow.primary_lawyer_id]
      if (uid) targets.add(uid)
    } else {
      lawyerRows.forEach((l: any) => targets.add(l.user_id))
    }
    for (const a of access || []) {
      const uid = lawyerUserById[a.lawyer_id]
      if (uid) targets.add(uid)
    }
    // المديرون معهم. والموكّل لا — الموعد الحرج شأن إجرائي داخلي.
    managerIds.forEach((m: string) => targets.add(m))

    const title = stagePrefix(stage, left)
    const body =
      (d.deadline_type || 'موعد') +
      (d.description ? ': ' + d.description : '') +
      '\nقضية ' + (caseRow.case_number || '') + ' — ' + (caseRow.title || '') +
      '\nالتاريخ: ' + prettyDate(dateStr)

    for (const userId of targets) {
      const { data: notifRow } = await admin
        .from('notifications')
        .insert({
          recipient_user_id: userId,
          case_id: d.case_id,
          type: 'deadline_reminder',
          title,
          body,
        })
        .select('id')
        .single()

      await sendPushToUser(
        admin,
        userId,
        title,
        body,
        '/lawyer/cases/' + d.case_id,
        notifRow?.id || ''
      )
    }

    await admin
      .from('critical_deadlines')
      .update({ last_reminded_stage: stage })
      .eq('id', d.id)

    deadlinesSent++
  }

  await logAudit(
    admin,
    null,
    'reminders_sent',
    'تذكير ليلي: ' + sessionsSent + ' رسالة جلسات، و' + deadlinesSent + ' موعداً حرجاً'
  )

  console.log('[cron] تذكير ليلي | جلسات=' + sessionsSent + ' | مواعيد=' + deadlinesSent)

  return NextResponse.json({ ok: true, sessionsSent, deadlinesSent, date: tomorrow })
}
