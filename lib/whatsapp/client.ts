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

/** إرسال رسالة نصّية إلى رقم. يُرجع true عند النجاح. */
export async function sendText(to: string, body: string): Promise<boolean> {
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
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    })

    if (res.ok) {
      console.log('[wa] sent ok | to=' + to)
      return true
    }

    const detail = await res.text().catch(() => '')
    console.log('[wa] FAILED | to=' + to + ' | status=' + res.status + ' | ' + detail.slice(0, 200))
    return false
  } catch (err: any) {
    console.log('[wa] خطأ شبكة | to=' + to + ' | ' + (err && err.message))
    return false
  }
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
