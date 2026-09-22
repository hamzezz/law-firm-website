import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { processSessionsText } from '@/lib/moj-parser/process-sessions'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)

const TG = 'https://api.telegram.org'

function token() {
  return process.env.TELEGRAM_BOT_TOKEN || ''
}

async function send(chatId: number, text: string) {
  try {
    await fetch(`${TG}/bot${token()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch {
    // لا نوقف المعالجة إن تعذّر إرسال رسالة
  }
}

/** يستخرج التاريخ من اسم الملف: "الموافق_19-9-2026م" أو "19-9-2026" */
function dateFromName(name: string): string | null {
  const m = name.match(/(\d{1,2})[-_](\d{1,2})[-_](\d{4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  const test = new Date(iso + 'T00:00:00')
  return isNaN(test.getTime()) ? null : iso
}

export async function POST(request: Request) {
  // سرّ مشترك في المسار يمنع استدعاء الطرف الثالث
  const url = new URL(request.url)
  if (url.searchParams.get('s') !== (process.env.TELEGRAM_WEBHOOK_SECRET || '')) {
    return NextResponse.json({ ok: true })
  }

  let update: any
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = update?.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat?.id
  const fromId = String(msg.from?.id || '')

  const allowed = (process.env.TELEGRAM_ALLOWED_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!allowed.includes(fromId)) {
    await send(chatId, 'هذا البوت مخصص لفريق مكتب وليد الكثيري.')
    return NextResponse.json({ ok: true })
  }

  const doc = msg.document
  if (!doc) {
    await send(chatId, 'أعد توجيه ملف قائمة الجلسات (PDF) إلى هنا، وسأحلّله وأطابقه بقضايا المكتب.')
    return NextResponse.json({ ok: true })
  }

  const fileName: string = doc.file_name || ''
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    await send(chatId, 'الملف ليس بصيغة PDF.')
    return NextResponse.json({ ok: true })
  }

  const sessionDate = dateFromName(fileName)
  if (!sessionDate) {
    await send(
      chatId,
      'تعذّر استخراج تاريخ الجلسات من اسم الملف.\nارفعه يدوياً من لوحة التحكم مع تحديد التاريخ.'
    )
    return NextResponse.json({ ok: true })
  }

  await send(chatId, `استلمت الملف.\nالتاريخ: <b>${sessionDate}</b>\nجارٍ التحليل...`)

  const tempPath = path.join(os.tmpdir(), 'tg-' + Date.now() + '.pdf')

  try {
    // تنزيل الملف من تلغرام
    const infoRes = await fetch(`${TG}/bot${token()}/getFile?file_id=${doc.file_id}`)
    const info = await infoRes.json()
    if (!info?.ok) throw new Error('تعذّر الوصول إلى الملف')

    const fileRes = await fetch(`${TG}/file/bot${token()}/${info.result.file_path}`)
    const buffer = Buffer.from(await fileRes.arrayBuffer())
    await writeFile(tempPath, buffer)

    const { stdout } = await execFileAsync('pdftotext', ['-layout', tempPath, '-'], {
      maxBuffer: 1024 * 1024 * 50,
    })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const result = await processSessionsText(admin, stdout, sessionDate)

    let reply = `✅ <b>تم التحليل</b>\nالتاريخ: ${sessionDate}\nالمستخرج: ${result.totalExtracted} قضية\nتخص المكتب: <b>${result.totalMatched}</b>`

    if (result.matchedCases.length > 0) {
      reply += '\n\n' + result.matchedCases
        .map((c: any) => `• ${c.title} — ${c.caseNumber}\n  ${c.clientName}`)
        .join('\n')
    }

    await send(chatId, reply)
  } catch (err) {
    await send(chatId, '⚠️ تعذّرت المعالجة: ' + (err instanceof Error ? err.message : String(err)))
  } finally {
    try {
      await unlink(tempPath)
    } catch {
      // تجاهل
    }
  }

  return NextResponse.json({ ok: true })
}
