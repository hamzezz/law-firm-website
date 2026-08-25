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
}

// رقم القضية: سنة هجرية (١٤٤٥-١٤٥٠ أو 1445-1450) / رقم تسلسلي
const CASE_NUMBER_PATTERN = /([١٤٤٥-١٤٥٠\d]{4}|[١٤][٤٥][٠-٩])\s*\/\s*([٠-٩\d]+)/g
const CASE_NUMBER_PATTERN_AR = /(١٤[٤٥][٠-٩])\/([٠-٩]+)/g
const CASE_NUMBER_PATTERN_EN = /(14[45][0-9])\/([0-9]+)/g

const COURT_PATTERN = /محكمة\s+([\u0621-\u064A]+(?:\s+[\u0621-\u064A]+){0,2})/

const TABLE_START_MARKER = 'موضـوع'
const PROSECUTION_MARKER = 'النيابة العامة'

/**
 * يستخرج أرقام القضايا من سطر واحد، مستبعداً أرقام النيابة العامة
 * (المميزة بحرف "هـ" الملتصق بها، أو المسبوقة بعبارة "النيابة العامة")
 */
function extractCaseNumbersFromLine(line: string): string[] {
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

      // استبعاد 2: الرقم مسبوق بعبارة "النيابة العامة" ضمن آخر 25 حرفاً قبله
      const precedingContext = line.slice(Math.max(0, match.index - 25), match.index)
      if (precedingContext.includes(PROSECUTION_MARKER)) continue

      const caseNumber = normalizeDigits(match[1]) + '/' + normalizeDigits(match[2])
      results.push(caseNumber)
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
    const tableStartIndex = page.indexOf(TABLE_START_MARKER)
    const headerArea = tableStartIndex !== -1 ? page.slice(0, tableStartIndex) : page
    const searchArea = tableStartIndex !== -1 ? page.slice(tableStartIndex) : page

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

    const lines = searchArea.split('\n')
    for (const line of lines) {
      const caseNumbers = extractCaseNumbersFromLine(line)
      for (const caseNumber of caseNumbers) {
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

export function deduplicateCases(cases: ExtractedCase[]): ExtractedCase[] {
  const seen = new Set<string>()
  const unique: ExtractedCase[] = []
  for (const c of cases) {
    const key = c.caseNumber + '|' + normalizeArabic(c.courtName)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(c)
    }
  }
  return unique
}
