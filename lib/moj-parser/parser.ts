/**
 * محلل ملفات جلسات وزارة العدل اليمنية (تقرير Crystal Reports اليومي)
 * منطق مطابق تماماً لما جرّبناه واختبرناه بنجاح على ملف حقيقي (551 قضية، 20 محكمة)
 */

// إزالة رموز التحكم الاتجاهية الخفية (Bidi) وتطبيع أشكال العرض العربية
function cleanText(text: string): string {
  const bidiControlChars = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g
  const withoutBidi = text.replace(bidiControlChars, '')
  return withoutBidi.normalize('NFKC')
}

// تحويل الأرقام العربية-الهندية إلى إنجليزية عادية (تطبيع موحّد للمطابقة)
export function normalizeDigits(text: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  return text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
}

export interface ExtractedCase {
  caseNumber: string // بصيغة موحّدة بأرقام إنجليزية، مثال: "1446/102"
  courtName: string
  pageNumber: number
}

// نمط رقم القضية: سنة هجرية تقريبية (١٤٤٥-١٤٥٠) / رقم تسلسلي، بأرقام عربية-هندية
const CASE_NUMBER_PATTERN = /(١٤[٤٥][٠-٩])\/([٠-٩]+)/g

// اسم المحكمة: كلمة "محكمة" متبوعة بـ 1-3 كلمات عربية فقط (بدون أرقام)
const COURT_PATTERN = /محكمة\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/

const TABLE_START_MARKER = 'موضـوع'

export function parseSessionsReport(fullText: string): ExtractedCase[] {
  const pages = fullText.split('\f') // form feed = فاصل الصفحات
  const results: ExtractedCase[] = []

  pages.forEach((rawPage, index) => {
    if (!rawPage.trim()) return

    const page = cleanText(rawPage)
    const tableStartIndex = page.indexOf(TABLE_START_MARKER)
    const headerArea = tableStartIndex !== -1 ? page.slice(0, tableStartIndex) : page
    const searchArea = tableStartIndex !== -1 ? page.slice(tableStartIndex) : page

    // استخراج اسم المحكمة من منطقة الهيدر فقط (تفادي التقاط كلمات زائدة من الجدول)
    let courtName = 'غير محدد'
    const headerLines = headerArea.split('\n')
    for (const line of headerLines) {
      if (line.includes('محكمة') && !line.includes('عدد الجلسات')) {
        const match = COURT_PATTERN.exec(line)
        if (match) {
          courtName = 'محكمة ' + match[1].trim()
          break
        }
      }
    }

    // استخراج كل أرقام القضايا من منطقة الجدول
    const lines = searchArea.split('\n')
    for (const line of lines) {
      let match: RegExpExecArray | null
      CASE_NUMBER_PATTERN.lastIndex = 0
      while ((match = CASE_NUMBER_PATTERN.exec(line)) !== null) {
        const caseNumber = normalizeDigits(match[1]) + '/' + normalizeDigits(match[2])
        results.push({
          caseNumber,
          courtName,
          pageNumber: index + 1,
        })
      }
    }
  })

  return results
}

// إزالة التكرارات (نفس القضية بنفس المحكمة قد تظهر أكثر من مرة أحياناً)
export function deduplicateCases(cases: ExtractedCase[]): ExtractedCase[] {
  const seen = new Set<string>()
  const unique: ExtractedCase[] = []
  for (const c of cases) {
    const key = c.caseNumber + '|' + c.courtName
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(c)
    }
  }
  return unique
}
