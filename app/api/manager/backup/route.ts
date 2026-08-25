import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير فقط' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const [
      usersResult,
      clientsResult,
      lawyersResult,
      casesResult,
      sessionsResult,
      documentsResult,
      deadlinesResult,
      accessResult,
      articlesResult,
      courtsResult,
    ] = await Promise.all([
      admin.from('users').select('*'),
      admin.from('clients').select('*'),
      admin.from('lawyers').select('*'),
      admin.from('cases').select('*'),
      admin.from('sessions').select('*'),
      admin.from('documents').select('*'),
      admin.from('critical_deadlines').select('*'),
      admin.from('case_lawyer_access').select('*'),
      admin.from('articles').select('*'),
      admin.from('yemen_courts').select('*'),
    ])

    const backup = {
      backup_version: '1.0',
      created_at: new Date().toISOString(),
      created_by: appUser.id,
      data: {
        users: usersResult.data || [],
        clients: clientsResult.data || [],
        lawyers: lawyersResult.data || [],
        cases: casesResult.data || [],
        sessions: sessionsResult.data || [],
        documents: documentsResult.data || [],
        critical_deadlines: deadlinesResult.data || [],
        case_lawyer_access: accessResult.data || [],
        articles: articlesResult.data || [],
        yemen_courts: courtsResult.data || [],
      },
      counts: {
        users: (usersResult.data || []).length,
        clients: (clientsResult.data || []).length,
        lawyers: (lawyersResult.data || []).length,
        cases: (casesResult.data || []).length,
        sessions: (sessionsResult.data || []).length,
        documents: (documentsResult.data || []).length,
        critical_deadlines: (deadlinesResult.data || []).length,
        articles: (articlesResult.data || []).length,
      },
    }

    const fileName = 'backup-' + new Date().toISOString().slice(0, 10) + '.json'

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="' + fileName + '"',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'فشل إنشاء النسخة الاحتياطية: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
