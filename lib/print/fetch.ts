import { createClient as createAdminClient } from '@supabase/supabase-js'

type Admin = ReturnType<typeof createAdminClient>

export type PrintDraft = { id: string; draft_no: number; word_path: string | null; pdf_path: string | null }
export type PrintNote = { id: string; body: string; is_resolved: boolean; draft_id: string | null }
export type PrintPage = { id: string; page_order: number }

export type PrintRequestRow = {
  id: string
  case_id: string
  docType: string
  note: string
  dueDate: string | null
  status: string
  createdAt: string
  caseNumber: string
  caseTitle: string
  courtName: string
  otherParty: string
  pages: PrintPage[]
  drafts: PrintDraft[]
  notes: PrintNote[]
}

const BASE = 'id, case_id, doc_type, note, due_date, status, created_at'
const PAGES = 'print_request_pages ( id, page_order )'
const NOTES = 'print_notes ( id, body, is_resolved, draft_id )'

/**
 * ضمّ المسودّات يحتاج تلميحاً للمفتاح.
 *
 * بين print_requests و print_drafts علاقتان لا واحدة: request_id في
 * المسودّات يشير إلى الطلب، و approved_draft_id في الطلب يشير إلى
 * المسودّة المعتمدة. فالضمّ بلا تلميح ملتبس، ويردّ PostgREST الاستعلام
 * كلّه فتعود القائمة فارغة — وهو ما وقع فعلاً.
 *
 * والتلميح هنا باسم العمود لا باسم القيد، لأن اسم القيد لم أتحقّق منه.
 * وإن لم يُقبل، يسقط الاستعلام إلى جلب المسودّات على حدة. فالنتيجة
 * صحيحة في الحالين، والسريع منهما هو الغالب.
 */
const DRAFTS_EMBED = 'print_drafts!request_id ( id, draft_no, word_path, pdf_path )'

const CASE_EMBED = 'cases ( case_number, title, court_name, other_party )'

function shape(r: any, drafts: PrintDraft[]): PrintRequestRow {
  const c = Array.isArray(r.cases) ? r.cases[0] : r.cases
  return {
    id: r.id,
    case_id: r.case_id,
    docType: r.doc_type || 'مذكّرة',
    note: r.note || '',
    dueDate: r.due_date,
    status: r.status,
    createdAt: r.created_at,
    caseNumber: c?.case_number || '',
    caseTitle: c?.title || '',
    courtName: c?.court_name || '',
    otherParty: c?.other_party || '',
    pages: (r.print_request_pages || []).slice().sort((a: any, b: any) => a.page_order - b.page_order),
    drafts: drafts.slice().sort((a, b) => a.draft_no - b.draft_no),
    notes: r.print_notes || [],
  }
}

/**
 * طلبات الطباعة بصفحاتها ومسودّاتها وملاحظاتها.
 * `apply` تضع الشرط (قضية بعينها، أو ما أُسند لطبّاع) على الاستعلام.
 */
export async function fetchPrintRequests(
  admin: Admin,
  apply: (q: any) => any,
  withCase = true
): Promise<PrintRequestRow[]> {
  const cols = [BASE, withCase ? CASE_EMBED : '', PAGES, NOTES].filter(Boolean).join(', ')

  const first = await apply(admin.from('print_requests').select(cols + ', ' + DRAFTS_EMBED))

  if (!first.error && first.data) {
    return (first.data as any[]).map((r) => shape(r, (r.print_drafts || []) as PrintDraft[]))
  }

  // الضمّ لم يُقبل: نجلب الطلبات ثم مسودّاتها
  const second = await apply(admin.from('print_requests').select(cols))
  const rows = (second.data || []) as any[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: draftRows } = await admin
    .from('print_drafts')
    .select('id, draft_no, word_path, pdf_path, request_id')
    .in('request_id', ids)

  const byRequest = new Map<string, PrintDraft[]>()
  for (const d of (draftRows || []) as any[]) {
    const list = byRequest.get(d.request_id) || []
    list.push({ id: d.id, draft_no: d.draft_no, word_path: d.word_path, pdf_path: d.pdf_path })
    byRequest.set(d.request_id, list)
  }

  return rows.map((r) => shape(r, byRequest.get(r.id) || []))
}
