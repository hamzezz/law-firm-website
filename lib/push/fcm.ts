import crypto from 'crypto'

/**
 * إرسال إشعارات FCM إلى تطبيق المكتب، بلا أي مكتبة خارجية.
 *
 * الطريق: مفتاح الخدمة (JSON) → رمز وصول من Google → طلب إرسال لكل جهاز.
 * ورمز الوصول يُخزَّن ويُعاد استعماله حتى قبيل انتهائه، فلا نُثقل Google
 * بطلب جديد مع كل إشعار.
 */

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

let account: ServiceAccount | null = null
let accountParsed = false

let cachedToken = ''
let cachedUntil = 0

function base64url(input: Buffer | string) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function serviceAccount(): ServiceAccount | null {
  if (accountParsed) return account
  accountParsed = true

  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim()
  if (!raw) {
    console.log('[fcm] FIREBASE_SERVICE_ACCOUNT غير مضبوط — قناة التطبيق معطّلة')
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.log('[fcm] مفتاح الخدمة ناقص الحقول المطلوبة')
      return null
    }
    // بعض لوحات الاستضافة تحفظ أسطر المفتاح كـ \n نصية لا كأسطر حقيقية
    parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n')
    account = parsed as ServiceAccount
  } catch (err: any) {
    console.log('[fcm] تعذّرت قراءة مفتاح الخدمة | ' + (err && err.message))
    account = null
  }

  return account
}

export function fcmConfigured() {
  return serviceAccount() !== null
}

async function accessToken(): Promise<string> {
  const sa = serviceAccount()
  if (!sa) return ''

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now < cachedUntil) return cachedToken

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  )

  let signature = ''
  try {
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(header + '.' + claims)
    signer.end()
    signature = base64url(signer.sign(sa.private_key))
  } catch (err: any) {
    console.log('[fcm] تعذّر توقيع الطلب | ' + (err && err.message))
    return ''
  }

  const assertion = header + '.' + claims + '.' + signature

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data || !data.access_token) {
      const detail = data ? JSON.stringify(data).slice(0, 200) : 'لا استجابة'
      console.log('[fcm] تعذّر الحصول على رمز الوصول | status=' + res.status + ' | ' + detail)
      return ''
    }

    cachedToken = data.access_token
    // هامش خمس دقائق قبل الانتهاء الفعلي
    cachedUntil = now + Math.max(60, Number(data.expires_in || 3600) - 300)
    return cachedToken
  } catch (err: any) {
    console.log('[fcm] خطأ شبكة عند طلب رمز الوصول | ' + (err && err.message))
    return ''
  }
}

export type FcmResult = { ok: boolean; dead: boolean; detail: string }

/** إرسال إشعار واحد إلى جهاز واحد. `dead` تعني أن الرمز لم يعد صالحاً فيُحذف. */
export async function sendFcmToToken(
  token: string,
  title: string,
  body: string,
  url: string,
  notificationId?: string
): Promise<FcmResult> {
  const sa = serviceAccount()
  if (!sa) return { ok: false, dead: false, detail: 'غير مهيّأ' }

  const bearer = await accessToken()
  if (!bearer) return { ok: false, dead: false, detail: 'لا رمز وصول' }

  const endpoint =
    'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send'

  const message = {
    message: {
      token,
      notification: { title, body },
      // قيم FCM نصّية وجوباً
      data: { url, notificationId: notificationId || '' },
      android: {
        priority: 'HIGH',
        notification: { sound: 'default', default_vibrate_timings: true },
      },
    },
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + bearer,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (res.ok) return { ok: true, dead: false, detail: '' }

    const data = await res.json().catch(() => null)
    const errorCode =
      (data &&
        data.error &&
        Array.isArray(data.error.details) &&
        data.error.details
          .map((d: any) => d && d.errorCode)
          .find((c: any) => typeof c === 'string')) ||
      (data && data.error && data.error.status) ||
      ''

    // رمز جهاز ميّت: حُذف التطبيق، أو أُعيد تثبيته، أو جُدِّد الرمز
    const dead =
      res.status === 404 ||
      errorCode === 'UNREGISTERED' ||
      errorCode === 'NOT_FOUND' ||
      errorCode === 'INVALID_ARGUMENT'

    return {
      ok: false,
      dead,
      detail: 'status=' + res.status + ' ' + (errorCode || JSON.stringify(data || {}).slice(0, 160)),
    }
  } catch (err: any) {
    return { ok: false, dead: false, detail: 'شبكة: ' + (err && err.message) }
  }
}
