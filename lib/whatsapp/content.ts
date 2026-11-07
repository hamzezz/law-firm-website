import { SPECIALTIES } from '@/lib/content/specialties'
import type { Row } from '@/lib/whatsapp/client'

/**
 * نصوص بوت واتساب.
 *
 * قاعدتان تحكمان هذا الملفّ:
 *
 * ١) البوت لا يُجيب عن سؤالٍ قانونيّ أبداً. كلّ ما هنا إداريّ محض —
 *    عنوان، وقت، إجراء، مستند. فلا يُنسب إلى المكتب رأيٌ لم يقله.
 *
 * ٢) المحادثة بقوائم تفاعلية يضغطها العميل، لا بأرقامٍ يكتبها.
 *    والكتابة تبقى مقبولة احتياطاً لمن لا تظهر عنده القوائم.
 *
 * والمستندات تُقرأ من lib/content/specialties.ts لا تُنسخ، فلا يفترق
 * ما يقوله البوت عمّا في الموقع.
 */

export const OFFICE_NAME = 'مكتب وليد الكثيري للمحاماة'
export const OFFICE_ADDRESS = 'إب، شارع المحافظة'
export const OFFICE_HOURS = 'السبت – الخميس، من الساعة ١ ظهراً حتى ١٠ مساءً'
export const PORTAL_URL = 'https://kathirilaw.com'

export function consultationFee() {
  return (process.env.WHATSAPP_CONSULT_FEE || '٢٠٬٠٠٠ ريال').trim()
}

export function walletNumber() {
  return (process.env.WHATSAPP_WALLET_NUMBER || '771774502').trim()
}

/* ───────────── القائمة الرئيسية ───────────── */

export const MENU_BODY =
  'أهلاً بك في ' + OFFICE_NAME + '.\n\n' +
  'اضغط الزرّ أدناه واختر ما تريد.'

export const MENU_BUTTON = 'الخدمات'

export const MENU_ROWS: Row[] = [
  { id: 'm:1', title: 'موقع المكتب' },
  { id: 'm:2', title: 'أوقات الدوام' },
  { id: 'm:3', title: 'مجالات العمل' },
  { id: 'm:4', title: 'المستندات المطلوبة', description: 'حسب نوع القضية' },
  { id: 'm:5', title: 'متابعة القضايا' },
  { id: 'm:6', title: 'الاستشارة ورسومها' },
  { id: 'm:7', title: 'معلومات قضيتي', description: 'لموكّلي المكتب المسجّلين' },
]

export const BACK_ROW: Row = { id: 'back', title: '⟵ القائمة الرئيسية' }

/* ───────────── مجالات العمل ───────────── */

export function specialtiesText() {
  let out = 'مجالات عمل المكتب:\n\n'
  SPECIALTIES.forEach(function (s) {
    out += '• ' + s.title + '\n'
  })
  return out.trimEnd()
}

export const DOCS_BODY = 'في أيّ مجال؟ اختر من القائمة.'
export const DOCS_BUTTON = 'المجالات'

/**
 * عناوين مختصرة للقائمة: واتساب يحدّ العنوان بـ٢٤ حرفاً، وثلاثةٌ من
 * تخصّصاتنا تتجاوزه فتظهر مبتورةً بثلاث نقاط.
 *
 * والمطابقة بكلمةٍ مفتاحية لا بالترتيب، فلو أُعيد ترتيب التخصّصات في
 * الموقع أو أُضيف واحد، بقي الاختصار صحيحاً ولم ينزلق إلى غير بابه.
 * وما لا يُطابق شيئاً يُقصّ آلياً، فلا يسقط أبداً.
 */
const SHORT_TITLES: Array<[RegExp, string]> = [
  [/جنائي/, 'القضاء الجنائي'],
  [/شركات|تجاري/, 'الشركات والتجارة'],
  [/أحوال|مواريث/, 'الأحوال الشخصية'],
  [/مدني/, 'القضاء المدني'],
  [/إداري|اداري/, 'القضاء الإداري'],
  [/تحكيم/, 'التحكيم والتسوية'],
]

function shortTitle(full: string): string {
  for (const [pattern, short] of SHORT_TITLES) {
    if (pattern.test(full)) return short
  }
  return full
}

export function specialtyRows(): Row[] {
  const rows: Row[] = SPECIALTIES.map(function (s, i) {
    const short = shortTitle(s.title)
    const row: Row = { id: 'd:' + i, title: short }
    // الاسم الكامل في السطر الثاني متى اختلف، فلا تضيع دقّته
    if (short !== s.title) row.description = s.title
    return row
  })
  rows.push(BACK_ROW)
  return rows
}

export function documentsFor(index: number) {
  const sp = SPECIALTIES[index]
  if (!sp) return null

  let out = 'المستندات المطلوبة — ' + sp.title + ':\n\n'
  sp.documents.forEach(function (d) {
    out += '• ' + d + '\n'
  })
  return out + '\nوقد تُطلب مستنداتٌ أخرى بحسب الحالة.'
}

/* ───────────── نصوص ثابتة ───────────── */

export const FOLLOW_UP =
  'يمكنك متابعة قضاياك وجلساتك عبر بوابة الموكّلين:\n' +
  PORTAL_URL + '\n\n' +
  'وتصلك إشعارات بمواعيد الجلسات أولاً بأول.\n' +
  'وإن لم يكن لديك حساب، راجع المكتب لإنشائه.'

export function consultationInfo() {
  return (
    'الاستشارة الأولية:\n\n' +
    'الرسوم: ' + consultationFee() + '\n' +
    'التحويل: محفظة جيب — ' + walletNumber() + '\n\n' +
    'بعد التحويل أرسل صورة إشعار التحويل على هذا الرقم، ' +
    'ويُعرض طلبك على المكتب.'
  )
}

/** يُردّ به على كل سؤالٍ قانونيّ. لا يُفتي ولا يَعِد بنتيجة. */
export const LEGAL_REDIRECT =
  'هذا سؤالٌ يحتاج نظراً في تفاصيله، ولا يصحّ الجواب عنه بلا اطّلاع على أوراقه.\n\n' +
  'لحجز استشارة، اختر «الاستشارة ورسومها» من القائمة، ' +
  'أو راجع المكتب في ' + OFFICE_ADDRESS + '.'

export const NOT_UNDERSTOOD = 'لم أفهم طلبك. اختر من القائمة أدناه.'

export const NOT_A_CLIENT =
  'لم أجد هذا الرقم في سجلّ موكّلي المكتب.\n\n' +
  'إن كنتَ موكّلاً ولم يُسجَّل رقمك، راجع المكتب لتحديثه.'

export function askCode(name: string) {
  return (
    'أهلاً ' + name + '.\n\n' +
    'للتأكيد، اكتب رقم هاتفك كاملاً كما هو مسجَّل لدى المكتب.'
  )
}

export const CODE_WRONG = 'الرقم غير مطابق. اكتبه مرّةً أخرى، أو اكتب 0 للعودة.'

export const NO_CASES =
  'لا توجد قضايا مفتوحة باسمك حالياً.\n\nلأيّ استفسار راجع المكتب.'

export const CASES_BODY = 'اختر القضية:'
export const CASES_BUTTON = 'قضاياي'

export const INFO_BODY = 'ماذا تريد أن تعرف؟'
export const INFO_BUTTONS = [
  { id: 'i:next', title: 'الجلسة القادمة' },
  { id: 'i:last', title: 'قرار الجلسة السابقة' },
  { id: 'back', title: 'القائمة الرئيسية' },
]
