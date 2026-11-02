/**
 * محلل ملفات جلسات وزارة العدل اليمنية
 * يعالج: تطبيع الحروف العربية المتشابهة + استبعاد أرقام النيابة العامة
 */

function cleanText(text: string): string {
  const bidiControlChars = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g
  const withoutBidi = text.replace(bidiControlChars, '')
  return withoutBidi.normalize('NFKC')
}

// تطبيع الحروف العربية المتشابهة (الهمزات، التاء المربوطة، الألف المقصورة)
export function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeDigits(text: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
}

export interface ExtractedCase {
  caseNumber: string
  courtName: string
  pageNumber: number
  rawLine: string
  sessionDate: string | null
}

const CASE_NUMBER_PATTERN_AR = /(١٤[٢٣٤٥][٠١٢٣٤٥٦٧٨٩])\/([٠١٢٣٤٥٦٧٨٩]+)/g
const CASE_NUMBER_PATTERN_EN = /(14[2-5][0-9])\/([0-9]+)/g

/**
 * تاريخ الكشف الميلادي.
 *
 * كان يُلتقط بنمط `YYYY-MM-DD` من أعلى الصفحة — **وكان خطأً في كلّ ملفّ**.
 * فأعلى كلّ صفحة جدولٌ صغير عنوانه «اليوم / التاريخ / عدد الجلسات» فيه
 * مواعيد الجلسات القادمة بترتيبٍ غير مرتّب، فكان النمط يلتقط أوّل موعدٍ
 * مستقبليّ فيه — ويختلف باختلاف الصفحة في الملفّ الواحد.
 *
 * اختُبر على ستّة كشوف من الوزارة: التقط ٢٠٢٦-١١-١٦ لكشف ٢٠٢٦-١١-٠٢،
 * و٢٠٢٦-١٠-٠٤ لكشف ٢٠٢٦-٠٩-٢٠، وهكذا في الستّة كلّها بلا استثناء.
 *
 * والتاريخ الحقيقي مكتوبٌ صراحةً في عنوان الصفحة:
 *   «قائمة الجلسات ليوم الإثنين/ ٢/نوفمبر/٢٠٢٦م»
 * فالمرساة اسم الشهر — ولا يرد مكتوباً بالحروف إلا هناك. ولا تصلح كلمة
 * «ليوم» مرساةً: كلمة «اليوم» في ترويسة الجدول الصغير تحتويها.
 */
const GREGORIAN_MONTHS: { name: string; num: number }[] = [
  { name: 'يناير', num: 1 },
  { name: 'فبراير', num: 2 },
  { name: 'مارس', num: 3 },
  { name: 'ابريل', num: 4 },
  { name: 'أبريل', num: 4 },
  { name: 'مايو', num: 5 },
  { name: 'يونيو', num: 6 },
  { name: 'يوليو', num: 7 },
  { name: 'اغسطس', num: 8 },
  { name: 'أغسطس', num: 8 },
  { name: 'سبتمبر', num: 9 },
  { name: 'اكتوبر', num: 10 },
  { name: 'أكتوبر', num: 10 },
  { name: 'نوفمبر', num: 11 },
  { name: 'ديسمبر', num: 12 },
]

/**
 * يستخرج تاريخ الكشف من أعلى الصفحة، أو `null` إن لم يجده.
 *
 * ولا يُخرج تاريخاً خارج ٢٠٢٠–٢١٠٠: فالعمود ميلاديّ، ولو تسرّب إليه
 * تاريخٌ هجريّ (١٤٤٨) لقبِله Postgres بلا شكوى وفسد السجلّ صامتاً.
 */
export function extractReportDate(headerArea: string): string | null {
  const text = normalizeDigits(headerArea)

  for (const month of GREGORIAN_MONTHS) {
    let from = 0
    for (;;) {
      const at = text.indexOf(month.name, from)
      if (at === -1) break
      from = at + 1

      const before = text.slice(Math.max(0, at - 24), at)
      const after = text.slice(at + month.name.length, at + month.name.length + 24)

      const days = before.match(/\d{1,2}/g)
      const years = after.match(/\d{4}/g)
      if (!days || !years) continue

      const day = parseInt(days[days.length - 1], 10)
      const year = parseInt(years[0], 10)

      if (day < 1 || day > 31) continue
      if (year < 2020 || year > 2100) continue

      const mm = String(month.num).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return year + '-' + mm + '-' + dd
    }
  }

  return null
}

// المحاكم الابتدائية تُسمّى "محكمة"، ومحاكم الاستئناف تُسمّى "الشعبة"
const COURT_PATTERN = /(محكمة|الشعبة)\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/

// علامات بداية الجدول: تختلف بين صفحات القضايا العادية وصفحات التنفيذ
const TABLE_START_MARKERS = ['موضـوع', 'طالب التنفيذ', 'المنفذ ضده', 'قرار الجلسة']

/** يجد بداية جدول القضايا في الصفحة مهما اختلف نوعها */
function findTableStart(page: string): number {
  for (const marker of TABLE_START_MARKERS) {
    const i = page.indexOf(marker)
    if (i !== -1) return i
  }
  return -1
}
const PROSECUTION_MARKER = 'النيابة العامة'

// نسخ غير شاملة (بلا g) للفحص فقط: الشاملة تحتفظ بـ lastIndex بين النداءات
const HAS_CASE_NUMBER_AR = /(١٤[٢٣٤٥][٠١٢٣٤٥٦٧٨٩])\/([٠١٢٣٤٥٦٧٨٩]+)/
const HAS_CASE_NUMBER_EN = /(14[2-5][0-9])\/([0-9]+)/

/**
 * خانة «رقم القضية» في كشف المحكمة ضيّقة، فإذا طال الرقم نزل آخر أرقامه
 * إلى سطرٍ تحته. ورد في كشف ٢٨/١٠/٢٠٢٦ ثلاث مرات، منها:
 *
 *     ... اعتداء على ملك الغير   ٢  ١٤٤٧/١٠٢١٥
 *     ... سلامه  غ.ج                           ٤
 *
 * والرقم الحقيقي ١٤٤٧/١٠٢٤، و«١٥» تسلسل الصف التصق بالرقم. فكان المحلّل
 * يقرأ ١٤٤٧/١٠٢ ولا يجد لها قضية، فتسقط الجلسة صامتةً.
 *
 * تُعاد هنا أرقام السطر التالي إن كان ينتهي برقمٍ من خانة أو خانتين ولا
 * يحمل رقم قضية خاصاً به — أي إنه تتمّة لا صفٌّ جديد.
 */
function trailingContinuationDigits(nextLine: string): string {
  if (!nextLine) return ''
  const clean = cleanText(nextLine).trim()
  if (!clean) return ''
  if (HAS_CASE_NUMBER_AR.test(clean) || HAS_CASE_NUMBER_EN.test(clean)) return ''

  const m = clean.match(/(?:^|\s)([٠١٢٣٤٥٦٧٨٩]{1,2}|[0-9]{1,2})$/)
  return m ? normalizeDigits(m[1]) : ''
}

/**
 * يستخرج أرقام القضايا من سطر واحد، مستبعداً أرقام النيابة العامة
 * (المميزة بحرف "هـ" الملتصق بها، أو المسبوقة بعبارة "النيابة العامة")
 *
 * continuation: أرقام نزلت إلى السطر التالي من خانة رقم القضية، إن وُجدت.
 */
function extractCaseNumbersFromLine(line: string, continuation: string = ''): string[] {
  const results: string[] = []
  const patterns = [CASE_NUMBER_PATTERN_AR, CASE_NUMBER_PATTERN_EN]

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(line)) !== null) {
      const fullMatch = match[0]
      const matchEnd = match.index + fullMatch.length

      // استبعاد 1: الرقم متبوع بحرف "هـ" أو "ه" مباشرة (رقم نيابة)
      const nextChars = line.slice(matchEnd, matchEnd + 2)
      if (nextChars.startsWith('هـ') || nextChars.startsWith('ه')) continue

      // ملاحظة: لا نستبعد الأرقام المسبوقة بعبارة "النيابة العامة"، لأنها قد تكون
      // موضوع القضية أو اسم الخصم لا بادئة لرقم نيابة. حرف "هـ" أعلاه هو المميّز الوحيد.

      const year = normalizeDigits(match[1])
      const serial = normalizeDigits(match[2])
      results.push(year + '/' + serial)

      // عند دمج أعمدة الجدول في استخراج النص، يلتصق رقم التسلسل برقم القضية.
      // مثال: "١٤٤٦/١٣٤" + تسلسل "١٠" يُقرأ "1446/13410".
      // نضيف الاحتمالات المقتطعة؛ اشتراط تطابق اسم أحد الأطراف يمنع المطابقات الخاطئة.
      if (serial.length > 1) results.push(year + '/' + serial.slice(0, -1))
      if (serial.length > 2) results.push(year + '/' + serial.slice(0, -2))

      /**
       * الرقم النازل إلى السطر التالي يُلحَق بالتسلسل، وبمقتطعاته أيضاً،
       * لأن تسلسل الصف قد يكون التصق بالرقم قبل أن ينزل آخره:
       *   «١٠٢١٥» + «٤»  →  ١٠٢١٥٤ ، ١٠٢١٤ ، ١٠٢٤ ← وهذا هو الصحيح.
       *
       * وهذه احتمالات تُضاف لا تُبدِّل: لا تُقبل واحدةٌ منها إلا إن طابقت
       * محكمةَ القضية واسمَ أحد أطرافها، وهو الشرط الذي يحمي من الخطأ.
       */
      if (continuation) {
        results.push(year + '/' + serial + continuation)
        if (serial.length > 1) results.push(year + '/' + serial.slice(0, -1) + continuation)
        if (serial.length > 2) results.push(year + '/' + serial.slice(0, -2) + continuation)
      }
    }
  }

  return results
}

export function parseSessionsReport(fullText: string): ExtractedCase[] {
  const pages = fullText.split('\f')
  const results: ExtractedCase[] = []

  pages.forEach((rawPage, index) => {
    if (!rawPage.trim()) return

    const page = cleanText(rawPage)
    const tableStartIndex = findTableStart(page)
    // اسم المحكمة يقع دائماً في رأس الصفحة؛ نحصر البحث في أول 12 سطراً
    // حتى لا يُلتقط اسم خاطئ من متن الجدول حين تتعذّر معرفة بدايته
    const headerArea =
      tableStartIndex !== -1
        ? page.slice(0, tableStartIndex)
        : page.split('\n').slice(0, 12).join('\n')
    const searchArea = tableStartIndex !== -1 ? page.slice(tableStartIndex) : page

    let courtName = 'غير محدد'
    const headerLines = headerArea.split('\n')
    for (const line of headerLines) {
      if ((line.includes('محكمة') || line.includes('الشعبة')) && !line.includes('عدد الجلسات')) {
        const match = COURT_PATTERN.exec(line)
        if (match) {
          courtName = match[1] + ' ' + match[2].trim()
          break
        }
      }
    }

    // تاريخ الكشف من عنوان الصفحة — لا من جدول المواعيد القادمة أعلاها
    const sessionDate: string | null = extractReportDate(headerArea)

    const lines = searchArea.split('\n')
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]
      const continuation = trailingContinuationDigits(lines[li + 1] || '')
      const caseNumbers = extractCaseNumbersFromLine(line, continuation)
      for (const caseNumber of caseNumbers) {
        results.push({
          caseNumber,
          courtName,
          pageNumber: index + 1,
          rawLine: line.trim(),
          sessionDate,
        })
      }
    }
  })

  return results
}

export function deduplicateCases(cases: ExtractedCase[]): ExtractedCase[] {
  const seen = new Set<string>()
  const unique: ExtractedCase[] = []
  for (const c of cases) {
    // نضمّ السطر إلى المفتاح: الرقم نفسه قد يرد في صفحتين مختلفتين لقضيتين
    // مختلفتين داخل المحكمة الواحدة، وإسقاط أحدهما يُفقد القضية الصحيحة
    const key = c.caseNumber + '|' + normalizeArabic(c.courtName) + '|' + normalizeArabic(c.rawLine || '')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(c)
    }
  }
  return unique
}
