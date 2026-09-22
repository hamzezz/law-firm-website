import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { processSessionsText } from '@/lib/moj-parser/process-sessions'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)


// كلمات عامة وأسماء شائعة لا تميّز شخصاً بعينه
export async function POST(request: Request) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 })
  }

  const { data: appUser } = await supabase
    .from('users')
    .select('id, role, username')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || appUser.role !== 'manager' || appUser.username !== 'tech') {
    return NextResponse.json({ error: 'هذا الإجراء متاح للمدير التقني فقط' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  // تاريخ الجلسات يُدخله المستخدم، لأن الملف لا يذكر التاريخ الميلادي صراحة
  const providedDate = (formData.get('sessionDate') as string | null) || null

  if (!file) {
    return NextResponse.json({ error: 'لم يتم إرفاق أي ملف' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const tempPath = path.join(os.tmpdir(), 'moj-upload-' + Date.now() + '.pdf')
  let fullText = ''

  try {
    await writeFile(tempPath, buffer)
    const { stdout } = await execFileAsync('pdftotext', ['-layout', tempPath, '-'], {
      maxBuffer: 1024 * 1024 * 50,
    })
    fullText = stdout
  } catch (err) {
    return NextResponse.json(
      { error: 'فشل استخراج نص الملف: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 400 }
    )
  } finally {
    try {
      await unlink(tempPath)
    } catch {
      // تجاهل
    }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const result = await processSessionsText(admin, fullText, providedDate)

  return NextResponse.json(result)
}
