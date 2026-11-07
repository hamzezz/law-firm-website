import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SPECIALTIES } from '@/lib/content/specialties'
import { localPhoneKey, cut, type Row } from '@/lib/whatsapp/client'
import { dateKey, dayMonthYear } from '@/lib/text/arabic'
import * as T from '@/lib/whatsapp/content'

type Admin = ReturnType<typeof createAdminClient>

/**
 * منطق محادثة البوت.
 *
 * آلة حالاتٍ بسيطة، وكلّ خطوة قائمةٌ تفاعلية يضغطها العميل. والحالة
 * تُحفظ في whatsapp_chats لأن واتساب لا يحمل سياقاً بين الرسائل.
 *
 * ولا يُكشف للموكّل إلا ما طلبه بعينه: موعد جلسةٍ أو قرارها — سطرٌ
 * واحد، لا ملفّ قضية. فمن أمسك الهاتف لا يجد سجلّاً.
 */

/** ما يُرسَل إلى العميل. الطبقة العليا تترجمه إلى حمولة واتساب. */
export type Reply =
  | { kind: 'text'; body: string }
  | { kind: 'list'; body: string; button: string; rows: Row[] }
  | { kind: 'buttons'; body: string; buttons: { id: string; title: string }[] }

type State = 'main' | 'docs' | 'auth' | 'case' | 'info'

/** تُنسى المحادثة بعد ساعةٍ من الخمول، فلا يرث الهاتفَ أحدٌ بتأكيدٍ قديم. */
const IDLE_MINUTES = 60

type Chat = {
  phone: string
  state: State
  client_id: string | null
  case_id: string | null
  updated_at: string
}

/* ───────────── الحالة ───────────── */

async function loadChat(admin: Admin, phone: string): Promise<Chat> {
  const { data } = await admin
    .from('whatsapp_chats')
    .select('phone, state, client_id, case_id, updated_at')
    .eq('phone', phone)
    .maybeSingle()

  if (!data) {
    return { phone, state: 'main', client_id: null, case_id: null, updated_at: '' }
  }

  const age = Date.now() - new Date(data.updated_at).getTime()
  if (age > IDLE_MINUTES * 60 * 1000) {
    return { phone, state: 'main', client_id: null, case_id: null, updated_at: '' }
  }

  return data as Chat
}

async function saveChat(
  admin: Admin,
  phone: string,
  state: State,
  clientId: string | null,
  caseId: string | null
) {
  await admin.from('whatsapp_chats').upsert(
    {
      phone,
      state,
      client_id: clientId,
      case_id: caseId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'phone' }
  )
}

/* ───────────── مُنشئات الردّ ───────────── */

function menu(): Reply {
  return { kind: 'list', body: T.MENU_BODY, button: T.MENU_BUTTON, rows: T.MENU_ROWS }
}

/** نصٌّ يتبعه زرّ العودة، حتى لا يبقى العميل في طريقٍ مسدود. */
function page(body: string): Reply {
  return {
    kind: 'buttons',
    body,
    buttons: [{ id: 'back', title: 'القائمة الرئيسية' }],
  }
}

/* ───────────── المدخل ───────────── */

/**
 * `choice` هو معرّف الصفّ أو الزرّ حين يضغط العميل القائمة،
 * و`text` نصّ ما كتبه حين يكتب. وأحدهما فارغ دائماً.
 */
export async function reply(
  admin: Admin,
  phone: string,
  text: string,
  choice: string | null
): Promise<Reply | null> {
  const chat = await loadChat(admin, phone)

  // معرّف من القائمة
  if (choice) return await onChoice(admin, phone, chat, choice)

  // أو نصّ مكتوب — ويُقبل الرقم احتياطاً لمن لا تظهر عنده القوائم
  const typed = numeric(text)

  if (typed === 0) {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return menu()
  }

  if (chat.state === 'auth') return await onAuth(admin, phone, chat, text)

  if (typed !== null) {
    const id = idForTyped(chat.state, typed)
    if (id) return await onChoice(admin, phone, chat, id)
    return withMenu(T.NOT_UNDERSTOOD)
  }

  /**
   * نصٌّ حرّ. وأوّل رسالةٍ من إنسانٍ تحيّةٌ لا سؤال — «السلام عليكم» —
   * فالردّ عليها بعبارة تحويل الاستشارة بدايةٌ منفّرة، وقد كشفت
   * المحاكاة هذا قبل النشر. فمن لم يرَ القائمة تُعرض عليه، ومن رآها
   * ثمّ كتب نصّاً حرّاً فالغالب أنه سؤالٌ قانونيّ يُحوَّل ولا يُجاب عنه.
   */
  const firstContact = !chat.updated_at
  await saveChat(admin, phone, 'main', chat.client_id, null)
  return firstContact ? menu() : withMenu(T.LEGAL_REDIRECT)
}

function withMenu(body: string): Reply {
  return { kind: 'list', body, button: T.MENU_BUTTON, rows: T.MENU_ROWS }
}

function numeric(text: string): number | null {
  const s = String(text || '')
    .replace(/[٠-٩]/g, function (d) {
      return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    })
    .trim()

  if (!/^\d{1,2}$/.test(s)) return null
  return Number(s)
}

/** يترجم رقماً مكتوباً إلى المعرّف المقابل في الحالة الحالية. */
function idForTyped(state: State, n: number): string | null {
  if (state === 'main') return n >= 1 && n <= 7 ? 'm:' + n : null
  if (state === 'docs') return n >= 1 && n <= SPECIALTIES.length ? 'd:' + (n - 1) : null
  if (state === 'case') return 'c:' + n
  if (state === 'info') return n === 1 ? 'i:next' : n === 2 ? 'i:last' : null
  return null
}

/* ───────────── المعالجة ───────────── */

async function onChoice(
  admin: Admin,
  phone: string,
  chat: Chat,
  id: string
): Promise<Reply | null> {
  if (id === 'back') {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return menu()
  }

  /* القائمة الرئيسية */
  if (id.startsWith('m:')) {
    const n = Number(id.slice(2))

    if (n === 1) return page('موقع المكتب:\n' + T.OFFICE_ADDRESS)
    if (n === 2) return page('أوقات الدوام:\n' + T.OFFICE_HOURS)
    if (n === 3) return page(T.specialtiesText())

    if (n === 4) {
      await saveChat(admin, phone, 'docs', chat.client_id, null)
      return { kind: 'list', body: T.DOCS_BODY, button: T.DOCS_BUTTON, rows: T.specialtyRows() }
    }

    if (n === 5) return page(T.FOLLOW_UP)
    if (n === 6) return page(T.consultationInfo())

    if (n === 7) {
      const client = await findClient(admin, phone)
      if (!client) return page(T.NOT_A_CLIENT)

      await saveChat(admin, phone, 'auth', client.id, null)
      return { kind: 'text', body: T.askCode(client.full_name || '') }
    }

    return withMenu(T.NOT_UNDERSTOOD)
  }

  /* المستندات حسب المجال */
  if (id.startsWith('d:')) {
    const i = Number(id.slice(2))
    const out = T.documentsFor(i)
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return out ? page(out) : withMenu(T.NOT_UNDERSTOOD)
  }

  /* اختيار قضية */
  if (id.startsWith('c:')) {
    const cases = await openCases(admin, chat.client_id)
    const n = Number(id.slice(2))
    const picked = cases[n - 1]
    if (!picked) return withMenu(T.NOT_UNDERSTOOD)

    await saveChat(admin, phone, 'info', chat.client_id, picked.id)
    return { kind: 'buttons', body: T.INFO_BODY, buttons: T.INFO_BUTTONS }
  }

  /* المعلومة المطلوبة */
  if (id === 'i:next' || id === 'i:last') {
    if (!chat.case_id) {
      await saveChat(admin, phone, 'main', chat.client_id, null)
      return menu()
    }
    const body =
      id === 'i:next'
        ? await nextSession(admin, chat.case_id)
        : await lastDecision(admin, chat.case_id)

    return {
      kind: 'buttons',
      body,
      buttons: [
        { id: 'i:next', title: 'الجلسة القادمة' },
        { id: 'i:last', title: 'قرار الجلسة السابقة' },
        { id: 'back', title: 'القائمة الرئيسية' },
      ],
    }
  }

  return withMenu(T.NOT_UNDERSTOOD)
}

async function onAuth(admin: Admin, phone: string, chat: Chat, text: string): Promise<Reply> {
  if (localPhoneKey(text) !== localPhoneKey(phone)) {
    return { kind: 'text', body: T.CODE_WRONG }
  }

  const cases = await openCases(admin, chat.client_id)
  if (cases.length === 0) {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return page(T.NO_CASES)
  }

  await saveChat(admin, phone, 'case', chat.client_id, null)

  // تسعٌ على الأكثر، ليبقى مكانٌ لصفّ العودة ضمن حدّ العشرة
  const rows: Row[] = cases.slice(0, 9).map(function (c, i) {
    return {
      id: 'c:' + (i + 1),
      title: cut(c.title || 'قضية', 24),
      description: cut([c.case_number, c.court_name].filter(Boolean).join(' — '), 72),
    }
  })
  rows.push(T.BACK_ROW)

  return { kind: 'list', body: T.CASES_BODY, button: T.CASES_BUTTON, rows }
}

/* ───────────── قاعدة البيانات ───────────── */

async function findClient(admin: Admin, phone: string) {
  const key = localPhoneKey(phone)
  if (!key) return null

  // الأرقام محفوظةٌ بصيغٍ مختلفة، فنجلب ثم نطابق بالمفتاح الموحَّد.
  const { data } = await admin
    .from('clients')
    .select('id, full_name, phone')
    .not('phone', 'is', null)

  for (const row of data || []) {
    if (localPhoneKey(row.phone) === key) return row
  }
  return null
}

async function openCases(admin: Admin, clientId: string | null) {
  if (!clientId) return [] as any[]

  const { data } = await admin
    .from('cases')
    .select('id, case_number, title, court_name, status')
    .eq('client_id', clientId)
    .neq('status', 'closed')
    .order('created_at', { ascending: true })

  return data || []
}

async function nextSession(admin: Admin, caseId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await admin
    .from('sessions')
    .select('session_date, status')
    .eq('case_id', caseId)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .limit(1)

  const row = (data || [])[0]
  if (!row) return 'لا توجد جلسةٌ قادمة مسجَّلة حتى الآن.'

  return 'موعد الجلسة القادمة: ' + dayMonthYear(dateKey(row.session_date))
}

async function lastDecision(admin: Admin, caseId: string) {
  const { data } = await admin
    .from('sessions')
    .select('session_date, status, notes')
    .eq('case_id', caseId)
    .in('status', ['held', 'not_held'])
    .order('session_date', { ascending: false })
    .limit(1)

  const row = (data || [])[0]
  if (!row) return 'لا توجد جلسةٌ سابقة مسجَّلة.'

  const when = dayMonthYear(dateKey(row.session_date))
  const note = String(row.notes || '').trim()

  if (!note) return 'جلسة ' + when + ': لم يُسجَّل قرارها بعد.'
  return 'جلسة ' + when + ':\n' + note
}
