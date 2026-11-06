import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifySignature, sendText, localPhoneKey } from '@/lib/whatsapp/client'
import { reply } from '@/lib/whatsapp/flow'

/**
 * نقطة استقبال رسائل واتساب التجاريّ.
 *
 * GET  — مصافحة التحقّق التي تطلبها Meta مرّةً عند ربط المسار.
 * POST — الرسائل الواردة.
 *
 * قاعدةٌ تحكم هذا الملفّ كلّه: نردّ 200 دائماً بعد التحقّق من التوقيع.
 * فـ Meta تُعيد إرسال أيّ رسالة لا تتلقّى عنها 200، وتُعيدها مراراً،
 * وقد تُعطّل المسار إن تكرّر الفشل. فالخطأ يُسجَّل ولا يُرفع.
 */

export async function GET(request: Request) {
  const url = new URL(request.url)

  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const expected = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim()

  // سرٌّ غير مضبوط: لا مصافحة. (الفارغ لا يُطابق الفارغ هنا.)
  if (!expected) {
    console.log('[wa] WHATSAPP_VERIFY_TOKEN غير مضبوط — رُفضت المصافحة')
    return new NextResponse('غير مهيّأ', { status: 503 })
  }

  if (mode === 'subscribe' && token === expected && challenge) {
    console.log('[wa] تمّت مصافحة التحقّق')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.log('[wa] مصافحة مرفوضة | mode=' + mode)
  return new NextResponse('مرفوض', { status: 403 })
}

export async function POST(request: Request) {
  // التوقيع يُحسب على النصّ الخام حرفاً بحرف، فلا يصحّ تحليل JSON قبله:
  // إعادة التسلسل تُغيّر المسافات فيختلف التوقيع.
  const raw = await request.text()

  if (!verifySignature(raw, request.headers.get('x-hub-signature-256'))) {
    console.log('[wa] توقيع غير صالح — رُفض الطلب')
    return new NextResponse('مرفوض', { status: 403 })
  }

  let payload: any = null
  try {
    payload = JSON.parse(raw)
  } catch {
    console.log('[wa] جسم غير صالح')
    return NextResponse.json({ ok: true })
  }

  try {
    await handle(payload)
  } catch (err: any) {
    // لا نرفع الخطأ: Meta تُعيد الإرسال بلا توقّف
    console.log('[wa] خطأ في المعالجة | ' + (err && err.message))
  }

  return NextResponse.json({ ok: true })
}

/** يستخرج الرسائل من بنية Meta المتشعّبة ويعالج كلّاً منها. */
async function handle(payload: any) {
  const entries = Array.isArray(payload && payload.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry && entry.changes) ? entry.changes : []

    for (const change of changes) {
      const value = change && change.value
      if (!value) continue

      // إشعارات حالة التسليم تصل على المسار نفسه، ولا تعنينا هنا
      const messages = Array.isArray(value.messages) ? value.messages : []

      for (const message of messages) {
        await handleMessage(message, value)
      }
    }
  }
}

async function handleMessage(message: any, value: any) {
  const from = String(message && message.from || '')
  if (!from) return

  // نقبل النصّ وحده في هذه المرحلة. الصوت والصور والمستندات
  // تُردّ بعبارةٍ واحدة بدل أن تُهمَل بصمت.
  if (message.type !== 'text') {
    await sendText(from, 'أهلاً بك. يستقبل هذا الرقم الرسائل النصّية فقط.')
    return
  }

  const text = String(message.text && message.text.body || '').trim()

  const profile =
    Array.isArray(value.contacts) && value.contacts[0] && value.contacts[0].profile
      ? String(value.contacts[0].profile.name || '')
      : ''

  console.log(
    '[wa] وردت | from=' + from +
    ' | key=' + localPhoneKey(from) +
    ' | name=' + profile +
    ' | len=' + text.length
  )

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const out = await reply(admin, from, text)
  if (out) await sendText(from, out)
}
