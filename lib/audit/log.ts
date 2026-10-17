import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * سجلّ التدقيق.
 *
 * يُكتب من الكود لا من محفّزات قاعدة البيانات، لأن المحفّز يرى ما تغيّر
 * ولا يرى من غيّره حين يجري التغيير بصلاحية الخادم — ورفع ملف الجلسات
 * والأرشفة وبوت المحكمة كلها كذلك، وهي أحسّ عملياتنا.
 *
 * ولا يُفشل العملية الأصلية أبداً: سجلٌّ ناقص أهون من إجراء مرفوض.
 */

export type AuditAction =
  // الحسابات والصلاحيات
  | 'lawyer_created'
  | 'client_created'
  | 'account_deleted'
  | 'password_changed'
  | 'case_access_granted'
  | 'case_access_revoked'
  // القضايا والجلسات
  | 'case_updated'
  | 'case_deleted'
  | 'case_closed'
  | 'session_created'
  | 'sessions_uploaded'
  // المستندات والأرشفة
  | 'case_archived'
  | 'backup_downloaded'
  // الدخول
  | 'login_success'
  | 'login_failed'

export async function logAudit(
  admin: ReturnType<typeof createAdminClient>,
  userId: string | null,
  action: AuditAction,
  description: string,
  extra?: Record<string, any>
) {
  try {
    await admin.from('audit_log').insert({
      user_id: userId,
      action,
      metadata: { description, ...(extra || {}) },
    })
  } catch (err: any) {
    console.log('[audit] تعذّر التسجيل | ' + action + ' | ' + (err && err.message))
  }
}

/** عميل إداري جاهز حين لا يكون بين يدي المنادي واحد */
export function auditClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
