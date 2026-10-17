import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { r2Put, r2Size, r2Configured } from '@/lib/r2/client'
import { logAudit } from '@/lib/audit/log'

/**
 * أرشفة مستندات قضية مغلقة إلى Cloudflare R2.
 *
 * الترتيب مقصود: ننقل كل الملفات ونتحقّق من وصول كلٍّ منها بحجمه الصحيح،
 * ولا نحذف أصلاً واحداً إلا بعد نجاح الجميع. فإن تعثّر ملف، تبقى النسخ
 * الأصلية كما هي وتُعاد المحاولة لاحقاً بلا ضرر — فالصفوف المنقولة
 * فعلاً لا تُنقل مرّتين.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء للإدارة وحدها' }, { status: 403 })
  }

  if (!r2Configured()) {
    return NextResponse.json(
      { error: 'الأرشيف غير مُهيَّأ: مفاتيح R2 غير مضبوطة على الخادم' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  const caseId = body?.caseId as string | undefined
  if (!caseId) {
    return NextResponse.json({ error: 'معرّف القضية ناقص' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // لا نؤرشف إلا قضية مغلقة فعلاً
  const { data: caseRow } = await admin
    .from('cases')
    .select('id, status, case_number')
    .eq('id', caseId)
    .maybeSingle()

  if (!caseRow) {
    return NextResponse.json({ error: 'القضية غير موجودة' }, { status: 404 })
  }
  if (caseRow.status !== 'closed') {
    return NextResponse.json({ error: 'تُؤرشَف القضايا المغلقة فقط' }, { status: 400 })
  }

  const { data: docs, error: docsError } = await admin
    .from('documents')
    .select('id, storage_path, file_size, mime_type, storage_provider')
    .eq('case_id', caseId)

  if (docsError) {
    return NextResponse.json({ error: 'تعذّر قراءة المستندات: ' + docsError.message }, { status: 500 })
  }

  const pending = (docs || []).filter((d: any) => d.storage_provider !== 'r2')
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, moved: 0, message: 'لا توجد مستندات تحتاج أرشفة' })
  }

  /* ═══ ١) النقل والتحقّق — بلا أي حذف ═══ */
  const movedPaths: string[] = []

  for (const d of pending) {
    const dl = await admin.storage.from('case-documents').download(d.storage_path)
    if (dl.error || !dl.data) {
      return NextResponse.json(
        { error: 'تعذّر قراءة الملف من التخزين: ' + d.storage_path, moved: movedPaths.length },
        { status: 500 }
      )
    }

    const bytes = new Uint8Array(await dl.data.arrayBuffer())

    try {
      await r2Put(d.storage_path, bytes, d.mime_type || 'application/octet-stream')
    } catch (e: any) {
      return NextResponse.json(
        { error: 'فشل الرفع إلى الأرشيف: ' + (e?.message || d.storage_path), moved: movedPaths.length },
        { status: 500 }
      )
    }

    // التحقّق: الحجم في الأرشيف يطابق ما رفعناه
    const size = await r2Size(d.storage_path)
    if (size === null || size !== bytes.length) {
      return NextResponse.json(
        { error: 'الملف لم يصل كاملاً إلى الأرشيف: ' + d.storage_path + ' — لم يُحذف أي أصل', moved: movedPaths.length },
        { status: 500 }
      )
    }

    const upd = await admin
      .from('documents')
      .update({ storage_provider: 'r2', archived_at: new Date().toISOString() })
      .eq('id', d.id)

    if (upd.error) {
      return NextResponse.json(
        { error: 'تعذّر تحديث سجل المستند: ' + upd.error.message + ' — لم يُحذف أي أصل', moved: movedPaths.length },
        { status: 500 }
      )
    }

    movedPaths.push(d.storage_path)
  }

  /* ═══ ٢) الحذف — بعد نجاح الجميع فقط ═══ */
  const del = await admin.storage.from('case-documents').remove(movedPaths)

  if (del.error) {
    // الملفات في الأرشيف وسجلّاتها محدَّثة، فالنظام سليم والقراءة تعمل.
    // بقي الأصل في Supabase ويشغل مساحة، وهذا أهون عطب ممكن.
    return NextResponse.json({
      ok: true,
      moved: movedPaths.length,
      warning: 'نُقلت المستندات بنجاح، لكن تعذّر حذف النسخ الأصلية: ' + del.error.message,
    })
  }

  await logAudit(admin, appUser.id, 'case_archived',
    'أرشف مستندات القضية ' + (caseRow.case_number || caseId) + ' (' + movedPaths.length + ' مستنداً)')

  return NextResponse.json({ ok: true, moved: movedPaths.length })
}
