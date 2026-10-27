/**
 * مُحلِّل نصّ المقال.
 *
 * الغاية: أن يكتب المحرّر نصّاً عربياً عادياً كما يكتبه في أي محرّر،
 * فيُستخرج منه البناء آلياً — دون أن يتعلّم ترميزاً كـ Markdown.
 *
 * القواعد مقصودة التحفّظ: ما لم تنطبق عليه قاعدة فهو فقرة عادية.
 * فالخطأ المحتمل أن يظهر عنوانٌ كفقرة، لا أن تتشوّه فقرة.
 */

/** جزء من فقرة: نصٌّ عادي، أو نصّ مادة بين علامتي اقتباس */
export type Segment = { t: string; q: boolean }

export type Block =
  | { kind: 'heading'; id: string; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'para'; segments: Segment[] }
  | { kind: 'refs'; items: string[] }

export type ParsedArticle = {
  blocks: Block[]
  headings: { id: string; text: string }[]
  /** أسطر قسم المراجع — القوانين التي استُشهد بها */
  references: string[]
  /** عدد الكلمات في متن المقال دون المراجع */
  words: number
  /** زمن القراءة بالدقائق، بحدٍّ أدنى دقيقة واحدة */
  minutes: number
}

/** أدوات الترتيب العربية التي تُستعمل عناوينَ للمباحث */
const ORDINALS = [
  'أولاً', 'اولاً', 'أولا', 'اولا',
  'ثانياً', 'ثانيا', 'ثالثاً', 'ثالثا',
  'رابعاً', 'رابعا', 'خامساً', 'خامسا',
  'سادساً', 'سادسا', 'سابعاً', 'سابعا',
  'ثامناً', 'ثامنا', 'تاسعاً', 'تاسعا',
  'عاشراً', 'عاشرا',
]

/** عناوين ختامية شائعة تُكتب وحدها في سطر */
const CLOSERS = ['الخلاصة', 'خلاصة', 'الخاتمة', 'تمهيد', 'مقدمة', 'المقدمة']

const OPEN_QUOTE = '«'
const REFS_MARKERS = ['المراجع:', 'المراجع', 'المصادر:', 'المصادر']

/**
 * يفصل نصّ الفقرة إلى أجزاء، ويُعلّم ما بين «» منها.
 * الغاية أن تتميّز نصوص المواد عن كلام الكاتب في القراءة السريعة.
 */
export function splitQuotes(text: string): Segment[] {
  const out: Segment[] = []
  const re = /«[^»]*»/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), q: false })
    out.push({ t: m[0], q: true })
    last = m.index + m[0].length
  }

  if (last < text.length) out.push({ t: text.slice(last), q: false })
  if (out.length === 0) out.push({ t: text, q: false })
  return out
}

/** نسبة ما بين علامتي الاقتباس من طول الفقرة */
function quoteRatio(segments: Segment[]) {
  const total = segments.reduce((n, s) => n + s.t.length, 0)
  if (total === 0) return 0
  const quoted = segments.reduce((n, s) => n + (s.q ? s.t.length : 0), 0)
  return quoted / total
}

/**
 * معرّف ثابت للعنوان يصلح لرابط داخلي.
 * يُبنى من ترتيب العنوان لا من نصّه، لأن النصّ العربي في المعرّف
 * يُرمَّز ترميزاً طويلاً يُفسد شكل الرابط.
 */
function headingId(index: number) {
  return 'q' + (index + 1)
}

function isListItem(line: string) {
  return /^[-–—•*]\s+/.test(line) || /^[٠-٩\d]+\s*[-.)]\s+/.test(line)
}

function stripBullet(line: string) {
  return line.replace(/^[-–—•*]\s+/, '').replace(/^[٠-٩\d]+\s*[-.)]\s+/, '')
}

function isHeading(line: string) {
  const t = line.trim()
  if (t.length === 0 || t.length > 80) return false

  // «أولاً: ...» و«ثانياً — ...»
  for (const w of ORDINALS) {
    if (t.startsWith(w + ':') || t.startsWith(w + ' ') || t.startsWith(w + '،')) return true
  }

  if (CLOSERS.includes(t)) return true

  // سطر قصير بلا علامة ختام جملة ولا فاصلة — غالباً عنوان
  const endsLikeSentence = /[.؟!:]$/.test(t)
  if (t.length <= 55 && !endsLikeSentence && !t.includes('،') && !t.startsWith(OPEN_QUOTE)) {
    return true
  }

  return false
}

function countWords(text: string) {
  const m = text.trim().match(/[^\s]+/g)
  return m ? m.length : 0
}

export function parseArticle(content: string): ParsedArticle {
  const raw = (content || '').replace(/\r\n/g, '\n')

  // الفقرات تفصلها الأسطر الفارغة؛ وإن لم توجد، فكلّ سطر فقرة.
  const chunks = raw.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean)

  const blocks: Block[] = []
  const headings: { id: string; text: string }[] = []
  let words = 0
  let inRefs = false
  const refs: string[] = []

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    // بداية قسم المراجع: كلّ ما بعده مراجع
    const firstLine = lines[0]
    if (!inRefs && REFS_MARKERS.some((m) => firstLine === m || firstLine === m.replace(':', ''))) {
      inRefs = true
      for (let i = 1; i < lines.length; i++) refs.push(lines[i])
      continue
    }

    if (inRefs) {
      for (const l of lines) refs.push(l)
      continue
    }

    // قائمة: كلّ أسطر الفقرة عناصر
    if (lines.every(isListItem)) {
      const items = lines.map(stripBullet)
      items.forEach((i) => { words += countWords(i) })
      blocks.push({ kind: 'list', items })
      continue
    }

    // عنوان مفرد في سطره
    if (lines.length === 1 && isHeading(lines[0])) {
      const id = headingId(headings.length)
      const text = lines[0].replace(/:$/, '')
      headings.push({ id, text })
      blocks.push({ kind: 'heading', id, text })
      continue
    }

    const joined = lines.join(' ')
    words += countWords(joined)

    const segments = splitQuotes(joined)

    // الفقرة التي هي نصّ مادة في معظمها تُفرد في كتلة مستقلّة
    if (joined.startsWith(OPEN_QUOTE) || quoteRatio(segments) >= 0.75) {
      blocks.push({ kind: 'quote', text: joined })
      continue
    }

    blocks.push({ kind: 'para', segments })
  }

  if (refs.length > 0) blocks.push({ kind: 'refs', items: refs })

  return {
    blocks,
    headings,
    references: refs,
    words,
    minutes: Math.max(1, Math.round(words / 200)),
  }
}

/** صيغة العدد في العربية: دقيقة، دقيقتان، ثلاث دقائق… */
export function minutesLabel(n: number) {
  if (n === 1) return 'دقيقة واحدة'
  if (n === 2) return 'دقيقتان'
  if (n >= 3 && n <= 10) return n + ' دقائق'
  return n + ' دقيقة'
}

/** تاريخ ميلادي بالأرقام والأشهر العربية */
export function formatArabicDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('ar-EG-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
