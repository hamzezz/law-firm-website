import crypto from 'crypto'

/**
 * قناة واتساب التجاريّ (WhatsApp Cloud API).
 *
 * مبنيّة على منوال lib/push/fcm.ts: بلا مكتبة خارجية، وكل خطأ يُسجَّل
 * ولا يُسقط الطلب — لأن Meta تُعيد إرسال أيّ رسالة لا نردّ عليها بنجاح،
 * فسقوط المسار يعني تكراراً لا نهائياً للرسالة نفسها.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

export function whatsappConfigured() {
  return Boolean(
    (process.env.WHATSAPP_TOKEN || '').trim() &&
    (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  )
}

/**
 * تحقّق من توقيع Meta.
 *
 * بلا هذا التحقّق يستطيع أيّ أحدٍ في الإنترنت أن يرسل إلى مسارنا
 * رسالةً يدّعي أنها من موكّل، فيستخرج بيانات قضيّته. فالتوقيع ليس
 * تحسيناً بل شرطُ أمانٍ لا يُتجاوز.
 *
 * والمقارنة بـ timingSafeEqual لا بـ === لئلّا يُستدلّ على التوقيع
 * من فروق زمن المقارنة.
 */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = (process.env.WHATSAPP_APP_SECRET || '').trim()

  // سرٌّ غير مضبوط: نُغلق الباب ولا نفتحه. (الخطأ الذي وقعنا فيه
  // في تيليجرام: السرّ الفارغ كان يطابق طلباً فارغاً.)
  if (!secret) return false
  if (!header || !header.startsWith('sha256=')) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const given = header.slice(7)

  if (given.length !== expected.length) return false

  try {
    return crypto.timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

/** إرسال أيّ حمولة إلى Graph. الأساس الذي تقوم عليه الدوال الثلاث. */
async function send(to: string, payload: Record<string, any>): Promise<boolean> {
  if (!whatsappConfigured()) {
    console.log('[wa] غير مهيّأ — لم تُرسل الرسالة')
    return false
  }

  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
  const token = (process.env.WHATSAPP_TOKEN || '').trim()

  try {
    const res = await fetch(GRAPH + '/' + phoneId + '/messages', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(Object.assign({ messaging_product: 'whatsapp', to }, payload)),
    })

    if (res.ok) {
      console.log('[wa] sent ok | to=' + to + ' | type=' + payload.type)
      return true
    }

    const detail = await res.text().catch(() => '')
    console.log('[wa] FAILED | to=' + to + ' | status=' + res.status + ' | ' + detail.slice(0, 300))
    return false
  } catch (err: any) {
    console.log('[wa] خطأ شبكة | to=' + to + ' | ' + (err && err.message))
    return false
  }
}

/** قصّ إلى حدّ واتساب بلا بتر الكلمة في منتصفها إن أمكن. */
export function cut(s: string, max: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

export async function sendText(to: string, body: string): Promise<boolean> {
  return await send(to, { type: 'text', text: { preview_url: false, body } })
}

export type Row = { id: string; title: string; description?: string }

/**
 * قائمة تفاعلية — يضغط العميل فيختار، ولا يكتب رقماً.
 *
 * حدود واتساب، وتجاوزُها يُرجع 400 لا رسالةً ناقصة:
 *   العنوان ٢٤ حرفاً · الوصف ٧٢ · زرّ القائمة ٢٠ · النصّ ١٠٢٤ · الصفوف ١٠
 * فنقصّ هنا لا في مكان الاستدعاء، حتى لا يُنسى في موضع.
 */
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: Row[],
  sectionTitle = 'الخدمات'
): Promise<boolean> {
  const safeRows = rows.slice(0, 10).map(function (r) {
    const row: Row = { id: cut(r.id, 200), title: cut(r.title, 24) }
    if (r.description) row.description = cut(r.description, 72)
    return row
  })

  return await send(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: cut(body, 1024) },
      action: {
        button: cut(buttonLabel, 20),
        sections: [{ title: cut(sectionTitle, 24), rows: safeRows }],
      },
    },
  })
}

/** أزرار سريعة — ثلاثة على الأكثر، وعنوان كلٍّ منها ٢٠ حرفاً. */
export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<boolean> {
  const safe = buttons.slice(0, 3).map(function (b) {
    return { type: 'reply', reply: { id: cut(b.id, 200), title: cut(b.title, 20) } }
  })

  return await send(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: cut(body, 1024) },
      action: { buttons: safe },
    },
  })
}

/**
 * توحيد شكل الرقم للمطابقة مع عمود clients.phone.
 *
 * واتساب يُرسل الرقم دولياً بلا علامة زائد: 967771774502
 * وقاعدتنا تحفظه محلّياً غالباً: 771774502
 * وقد يُحفظ بصيغٍ أخرى: 00967…، +967…، أو بمسافاتٍ وشُرَط.
 *
 * فنُرجع الأرقام وحدها بعد حذف مفتاح اليمن، ليستوي الطرفان.
 */
export function localPhoneKey(raw: string | null | undefined): string {
  if (!raw) return ''

  // الأرقام الهندية إلى اللاتينية، ثم حذف كل ما ليس رقماً
  let s = String(raw).replace(/[٠-٩]/g, function (d) {
    return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  })
  s = s.replace(/\D/g, '')

  if (s.startsWith('00967')) s = s.slice(5)
  else if (s.startsWith('967')) s = s.slice(3)

  // بعض الأرقام تُكتب بصفرٍ بادئ محلّياً
  s = s.replace(/^0+/, '')

  return s
}
