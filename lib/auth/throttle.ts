import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * حارس محاولات الدخول.
 *
 * لم يكن في النظام أيّ حدّ لمحاولات الدخول: يستطيع أحدٌ أن يجرّب آلاف
 * كلمات المرور في الدقيقة على اسمٍ معروف كـ tech أو walid.
 *
 * واخترنا الإبطاء لا الإغلاق عمداً: الإغلاق يمكّن خصماً من حبس
 * الأستاذ وليد خارج حسابه بخمس محاولات خاطئة يوم جلسته. والإبطاء
 * يقتل الهجوم الآليّ — فهو يحتاج آلاف المحاولات — ولا يُغلق على
 * صاحب الحقّ باباً أبداً.
 *
 * ولا جدول جديد: سجلّ التدقيق يكتب المحاولات الفاشلة أصلاً، فنعدّ منه.
 *
 * وفيه فائدة ثانية: كلّ محاولاتنا تصل Supabase من عنوان خادمٍ واحد،
 * فهجومٌ كثيف قد يُفعّل حدودهم على عنواننا فيُمنع فريق المكتب كلّه.
 * والحارس يوقف المحاولة قبل أن تصل إليهم.
 */

/** نافذة العدّ */
const WINDOW_MINUTES = 15

/** أول محاولة فاشلة يبدأ بعدها الإبطاء */
const FREE_ATTEMPTS = 3

/** سقف الإبطاء */
const MAX_DELAY_MS = 10_000

/** عدد الفشل من عنوان واحد الذي يُمنع بعده المنعُ الصريح */
const IP_BLOCK_THRESHOLD = 40

export type ThrottleVerdict = {
  /** false ← يُرفض الطلب فوراً */
  allow: boolean
  /** كم ننتظر قبل تجربة كلمة المرور */
  delayMs: number
  /** للرسالة حين يُمنع */
  reason?: string
}

/** عنوان الطالب خلف وسيط Render */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || ''
  const first = fwd.split(',')[0].trim()
  if (first) return first
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function sleep(ms: number) {
  if (ms <= 0) return
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * الإبطاء يتضاعف: ٤ محاولات ← ثانيتان، ٥ ← أربع، ٦ ← ثمان، ثم يثبت عند عشر.
 */
function delayFor(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0
  const ms = 1000 * Math.pow(2, failures - FREE_ATTEMPTS)
  return Math.min(ms, MAX_DELAY_MS)
}

export async function checkLoginThrottle(
  admin: ReturnType<typeof createAdminClient>,
  username: string,
  ip: string
): Promise<ThrottleVerdict> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()

  try {
    const [byUser, byIp] = await Promise.all([
      /**
       * المحاولات المرفوضة للحدّ تُستثنى من العدّ (throttled).
       * وإلا زاد الرفضُ العدّادَ فامتدّ المنع بلا نهاية ما دام المهاجم
       * يطرق — وكذلك لو وقع المنع على مكتبٍ بالخطأ لما انتهى أبداً.
       */
      admin
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'login_failed')
        .eq('metadata->>username', username)
        .is('metadata->>throttled', null)
        .gte('created_at', since),
      ip && ip !== 'unknown'
        ? admin
            .from('audit_log')
            .select('id', { count: 'exact', head: true })
            .eq('action', 'login_failed')
            .eq('metadata->>ip', ip)
            .is('metadata->>throttled', null)
            .gte('created_at', since)
        : Promise.resolve({ count: 0 } as any),
    ])

    const userFails = byUser.count || 0
    const ipFails = (byIp as any).count || 0

    // المنع على العنوان وحده، لا على الحساب: المهاجم يُحجب ولا يتأذّى صاحب الحقّ
    if (ipFails >= IP_BLOCK_THRESHOLD) {
      return {
        allow: false,
        delayMs: 0,
        reason: 'تجاوزتَ عدد المحاولات المسموح. حاول بعد نصف ساعة.',
      }
    }

    return { allow: true, delayMs: delayFor(userFails) }
  } catch {
    /**
     * تعذّر العدّ ← نسمح بالمحاولة.
     * حارسٌ معطّل أهون من بابٍ مغلق في وجه المكتب كلّه لعطلٍ في الشبكة.
     */
    return { allow: true, delayMs: 0 }
  }
}
