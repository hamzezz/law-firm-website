import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SPECIALTIES } from '@/lib/content/specialties'
import { localPhoneKey } from '@/lib/whatsapp/client'
import { dateKey, dayMonthYear } from '@/lib/text/arabic'
import * as T from '@/lib/whatsapp/content'

type Admin = ReturnType<typeof createAdminClient>

/**
 * منطق محادثة البوت.
 *
 * آلة حالاتٍ بسيطة، وكلّ خطوة بقائمة أرقام. والحالة تُحفظ في
 * whatsapp_chats لأن واتساب لا يحمل سياقاً بين الرسائل.
 *
 * ولا يُكشف للموكّل إلا ما طلبه بعينه: موعد جلسةٍ أو قرارها — سطرٌ
 * واحد، لا ملفّ قضية. فمن أمسك الهاتف لا يجد سجلّاً.
 */

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
    // خمولٌ طويل: تُمحى الهوية المؤكَّدة ويُبدأ من جديد
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

/** الرقم المرسَل من القائمة، أو null إن لم تكن الرسالة رقماً. */
function choice(text: string): number | null {
  const s = text.replace(/[٠-٩]/g, function (d) {
    return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  }).trim()

  if (!/^\d{1,2}$/.test(s)) return null
  return Number(s)
}

/**
 * الردّ على رسالةٍ واردة.
 * يُرجع النصّ الذي يُرسَل، أو null إن لم يكن هناك ما يُقال.
 */
export async function reply(
  admin: Admin,
  phone: string,
  text: string
): Promise<string | null> {
  const chat = await loadChat(admin, phone)
  const n = choice(text)

  // 0 تُعيد إلى القائمة من أيّ موضع، وتُسقط القضية المختارة
  if (n === 0) {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return T.MAIN_MENU
  }

  if (chat.state === 'main') return await onMain(admin, phone, chat, n)
  if (chat.state === 'docs') return onDocs(admin, phone, chat, n)
  if (chat.state === 'auth') return await onAuth(admin, phone, chat, text)
  if (chat.state === 'case') return await onCase(admin, phone, chat, n)
  if (chat.state === 'info') return await onInfo(admin, phone, chat, n)

  await saveChat(admin, phone, 'main', null, null)
  return T.MAIN_MENU
}

async function onMain(admin: Admin, phone: string, chat: Chat, n: number | null) {
  if (n === null) {
    /**
     * أوّل رسالةٍ من إنسانٍ تحيّةٌ لا سؤال — «السلام عليكم»، «مرحباً».
     * فالردّ عليها بعبارة تحويل الاستشارة بدايةٌ منفّرة، وقد كشفت
     * المحاكاة هذا قبل النشر.
     *
     * فمن لم يرَ القائمة بعد تُعرض عليه، ومن رآها ثم كتب نصّاً حرّاً
     * فالغالب أنه سؤالٌ قانونيّ يُحوَّل ولا يُجاب عنه.
     */
    const firstContact = !chat.updated_at

    await saveChat(admin, phone, 'main', chat.client_id, null)
    return firstContact ? T.MAIN_MENU : T.LEGAL_REDIRECT
  }

  if (n === 1) return 'موقع المكتب: ' + T.OFFICE_ADDRESS + T.BACK_HINT
  if (n === 2) return 'أوقات الدوام: ' + T.OFFICE_HOURS + T.BACK_HINT
  if (n === 3) return T.specialtiesList()

  if (n === 4) {
    await saveChat(admin, phone, 'docs', chat.client_id, null)
    return T.specialtiesPrompt()
  }

  if (n === 5) return T.FOLLOW_UP
  if (n === 6) return T.consultationInfo()

  if (n === 7) {
    const client = await findClient(admin, phone)
    if (!client) return T.NOT_A_CLIENT

    await saveChat(admin, phone, 'auth', client.id, null)
    return T.askCode(client.full_name || '')
  }

  return T.NOT_UNDERSTOOD
}

function onDocs(admin: Admin, phone: string, chat: Chat, n: number | null) {
  if (n === null || n < 1 || n > SPECIALTIES.length) return T.NOT_UNDERSTOOD

  const out = T.documentsFor(n - 1)
  saveChat(admin, phone, 'main', chat.client_id, null)
  return out || T.NOT_UNDERSTOOD
}

async function findClient(admin: Admin, phone: string) {
  const key = localPhoneKey(phone)
  if (!key) return null

  // الأرقام محفوظةٌ بصيغٍ مختلفة، فنجلب ثم نطابق بالمفتاح الموحَّد.
  const { data } = await admin
    .from('clients')
    .select('id, full_name, phone')
    .not('phone', 'is', null)

  const rows = data || []
  for (const row of rows) {
    if (localPhoneKey(row.phone) === key) return row
  }
  return null
}

async function onAuth(admin: Admin, phone: string, chat: Chat, text: string) {
  // التأكيد: يكتب رقمه كما هو مسجَّل. ومطابقته بالمفتاح الموحَّد
  // حتى لا يُردّ عليه لاختلاف الصيغة وحدها.
  if (localPhoneKey(text) !== localPhoneKey(phone)) return T.CODE_WRONG

  const cases = await openCases(admin, chat.client_id)
  if (cases.length === 0) {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return T.NO_CASES
  }

  await saveChat(admin, phone, 'case', chat.client_id, null)

  let out = 'قضاياك:\n\n'
  cases.forEach(function (c, i) {
    out += (i + 1) + ' · ' + (c.title || 'قضية') + ' — ' + (c.case_number || '') + '\n'
  })
  return out + '\nأرسل رقم القضية.' + T.BACK_HINT
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

async function onCase(admin: Admin, phone: string, chat: Chat, n: number | null) {
  const cases = await openCases(admin, chat.client_id)

  if (n === null || n < 1 || n > cases.length) return T.NOT_UNDERSTOOD

  await saveChat(admin, phone, 'info', chat.client_id, cases[n - 1].id)
  return T.INFO_MENU
}

async function onInfo(admin: Admin, phone: string, chat: Chat, n: number | null) {
  if (!chat.case_id) {
    await saveChat(admin, phone, 'main', chat.client_id, null)
    return T.MAIN_MENU
  }

  if (n === 1) return await nextSession(admin, chat.case_id)
  if (n === 2) return await lastDecision(admin, chat.case_id)

  return T.NOT_UNDERSTOOD
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
  if (!row) return 'لا توجد جلسةٌ قادمة مسجَّلة حتى الآن.' + T.BACK_HINT

  return 'موعد الجلسة القادمة: ' + dayMonthYear(dateKey(row.session_date)) + T.BACK_HINT
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
  if (!row) return 'لا توجد جلسةٌ سابقة مسجَّلة.' + T.BACK_HINT

  const when = dayMonthYear(dateKey(row.session_date))
  const note = String(row.notes || '').trim()

  if (!note) return 'جلسة ' + when + ': لم يُسجَّل قرارها بعد.' + T.BACK_HINT

  return 'جلسة ' + when + ':\n' + note + T.BACK_HINT
}
