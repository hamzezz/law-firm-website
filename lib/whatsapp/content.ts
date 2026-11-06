import { SPECIALTIES } from '@/lib/content/specialties'

/**
 * نصوص بوت واتساب.
 *
 * قاعدتان تحكمان هذا الملفّ:
 *
 * ١) البوت لا يُجيب عن سؤالٍ قانونيّ أبداً. كلّ ما هنا إداريّ محض —
 *    عنوان، وقت، إجراء، مستند. فلا يُنسب إلى المكتب رأيٌ لم يقله.
 *
 * ٢) المحادثة بقائمة أرقامٍ لا بنصٍّ حرّ. فالنصّ الحرّ يُغري بسؤالٍ
 *    قانونيّ يضطرّ البوت إلى تجاهله أو الخطأ فيه، والقائمة تُغلق الباب.
 *
 * والمستندات تُقرأ من lib/content/specialties.ts لا تُنسخ، فلا يفترق
 * ما يقوله البوت عمّا في الموقع.
 */

export const OFFICE_NAME = 'مكتب وليد الكثيري للمحاماة'
export const OFFICE_ADDRESS = 'إب، شارع المحافظة'
export const OFFICE_HOURS = 'السبت – الخميس، من الساعة ١ ظهراً حتى ١٠ مساءً'
export const PORTAL_URL = 'https://kathirilaw.com'

/** الرسوم ورقم المحفظة من متغيّرات البيئة، فتُغيَّر بلا نشرٍ جديد. */
export function consultationFee() {
  return (process.env.WHATSAPP_CONSULT_FEE || '٢٠٬٠٠٠ ريال').trim()
}

export function walletNumber() {
  return (process.env.WHATSAPP_WALLET_NUMBER || '771774502').trim()
}

export const MAIN_MENU =
  'أهلاً بك في ' + OFFICE_NAME + '.\n\n' +
  'اختر رقماً:\n\n' +
  '1 · موقع المكتب\n' +
  '2 · أوقات الدوام\n' +
  '3 · مجالات العمل\n' +
  '4 · المستندات المطلوبة\n' +
  '5 · متابعة القضايا\n' +
  '6 · الاستشارة ورسومها\n' +
  '7 · أنا موكّل — معلومات قضيتي\n\n' +
  'أرسل الرقم فقط.'

export const BACK_HINT = '\n\nأرسل 0 للعودة إلى القائمة.'

export function specialtiesList() {
  let out = 'مجالات عمل المكتب:\n\n'
  SPECIALTIES.forEach(function (s, i) {
    out += (i + 1) + ' · ' + s.title + '\n'
  })
  return out + BACK_HINT
}

export function specialtiesPrompt() {
  let out = 'في أيّ مجال؟ أرسل رقمه:\n\n'
  SPECIALTIES.forEach(function (s, i) {
    out += (i + 1) + ' · ' + s.title + '\n'
  })
  return out.trimEnd() + BACK_HINT
}

export function documentsFor(index: number) {
  const sp = SPECIALTIES[index]
  if (!sp) return null

  let out = 'المستندات المطلوبة — ' + sp.title + ':\n\n'
  sp.documents.forEach(function (d) {
    out += '• ' + d + '\n'
  })
  out += '\nوقد تُطلب مستنداتٌ أخرى بحسب الحالة.'
  return out + BACK_HINT
}

export const FOLLOW_UP =
  'يمكنك متابعة قضاياك وجلساتك عبر بوابة الموكّلين:\n' +
  PORTAL_URL + '\n\n' +
  'وتصلك إشعارات بمواعيد الجلسات أولاً بأول.\n' +
  'وإن لم يكن لديك حساب، راجع المكتب لإنشائه.' +
  BACK_HINT

export function consultationInfo() {
  return (
    'الاستشارة الأولية:\n\n' +
    'الرسوم: ' + consultationFee() + '\n' +
    'التحويل: محفظة جيب — ' + walletNumber() + '\n\n' +
    'بعد التحويل أرسل صورة إشعار التحويل على هذا الرقم، ' +
    'ويُعرض طلبك على المكتب.' +
    BACK_HINT
  )
}

/** يُردّ به على كل سؤالٍ قانونيّ. لا يُفتي ولا يَعِد بنتيجة. */
export const LEGAL_REDIRECT =
  'هذا سؤالٌ يحتاج نظراً في تفاصيله، ولا يصحّ الجواب عنه بلا اطّلاع على أوراقه.\n\n' +
  'للاستشارة: أرسل 6 لمعرفة الرسوم وطريقة الحجز، أو راجع المكتب في ' +
  OFFICE_ADDRESS + '.'

export const NOT_UNDERSTOOD =
  'لم أفهم طلبك. أرسل رقماً من القائمة، أو 0 لعرضها من جديد.'

export const NOT_A_CLIENT =
  'لم أجد هذا الرقم في سجلّ موكّلي المكتب.\n\n' +
  'إن كنتَ موكّلاً ولم يُسجَّل رقمك، راجع المكتب لتحديثه.' +
  BACK_HINT

export function askCode(name: string) {
  return (
    'أهلاً ' + name + '.\n\n' +
    'للتأكيد، أرسل رقم هاتفك كاملاً كما هو مسجَّل لدى المكتب.' +
    BACK_HINT
  )
}

export const CODE_WRONG =
  'الرقم غير مطابق. حاول مرّةً أخرى، أو أرسل 0 للعودة.'

export const NO_CASES =
  'لا توجد قضايا مفتوحة باسمك حالياً.\n\n' +
  'لأيّ استفسار راجع المكتب.' +
  BACK_HINT

export const INFO_MENU =
  'ماذا تريد أن تعرف؟\n\n' +
  '1 · موعد الجلسة القادمة\n' +
  '2 · قرار الجلسة السابقة' +
  BACK_HINT
