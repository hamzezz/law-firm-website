'use client'

import { useEffect, useRef, useState } from 'react'
import type { LegalPost } from '@/lib/posts/legal-posts'

/**
 * بطاقات المنشورات.
 *
 * تُرسم على Canvas بلا أي مكتبة: المتصفّح نفسه يشكّل العربية ويصلها،
 * ويكفينا أن نضبط الاتجاه ونقسّم السطور بالقياس.
 *
 * والمقاس 1080×1350 (٤:٥) وهو أطول ما يقبله فيسبوك في التدفّق، فيأخذ
 * من الشاشة أكثر من المربّع، وكلّما طال مكث القارئ ارتفع ترتيب المنشور.
 */

const W = 1080
const H = 1350
const PAD = 86

type Tone = 'dark' | 'light'

const TONES: Record<Tone, { bg: string; bg2: string; fg: string; muted: string; gold: string; rule: string }> = {
  dark: { bg: '#0d1218', bg2: '#131c25', fg: '#f2efe9', muted: '#9fb0c0', gold: '#c9a45c', rule: 'rgba(201,164,92,.30)' },
  light: { bg: '#f6f4f0', bg2: '#ffffff', fg: '#131a21', muted: '#5d6b78', gold: '#8a6520', rule: 'rgba(138,101,32,.28)' },
}

/** يقسّم النصّ سطوراً لا يتجاوز أيٌّ منها العرض المتاح */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      const next = line ? line + ' ' + word : word
      if (ctx.measureText(next).width > maxWidth && line) {
        out.push(line)
        line = word
      } else {
        line = next
      }
    }
    out.push(line)
  }
  return out
}

function draw(canvas: HTMLCanvasElement, post: LegalPost, tone: Tone) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const c = TONES[tone]

  canvas.width = W
  canvas.height = H
  ctx.clearRect(0, 0, W, H)

  // خلفية متدرّجة خفيفة — لا لون مسطّح
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, c.bg)
  bg.addColorStop(1, c.bg2)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // شريط ذهبي علوي
  ctx.fillStyle = c.gold
  ctx.fillRect(0, 0, W, 9)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  const right = W - PAD
  const maxW = W - PAD * 2

  // ترويسة: اسم القانون والمادة
  ctx.font = '500 29px Tajawal, sans-serif'
  ctx.fillStyle = c.muted
  ctx.fillText(post.law + '  ·  ' + post.articles, right, 128)

  // العنوان
  ctx.font = '800 60px Cairo, sans-serif'
  ctx.fillStyle = c.fg
  const titleLines = wrap(ctx, post.title, maxW)
  let y = 232
  for (const line of titleLines) {
    ctx.fillText(line, right, y)
    y += 82
  }

  // فاصل
  y += 26
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(right, y)
  ctx.lineTo(PAD, y)
  ctx.stroke()
  y += 76

  // نصّ المادة — الكتلة الرئيسية
  ctx.font = '400 44px Tajawal, sans-serif'
  const quoteLines = wrap(ctx, '«' + post.quote + '»', maxW - 42)
  const quoteTop = y - 54
  for (const line of quoteLines) {
    ctx.fillStyle = c.fg
    ctx.fillText(line, right - 42, y)
    y += 74
  }

  // قضيب ذهبي يحاذي الاقتباس من اليمين
  ctx.fillStyle = c.gold
  ctx.fillRect(right - 8, quoteTop, 8, y - 74 - quoteTop + 22)

  // التذييل
  const footY = H - 118
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(right, footY - 54)
  ctx.lineTo(PAD, footY - 54)
  ctx.stroke()

  ctx.font = '700 33px Cairo, sans-serif'
  ctx.fillStyle = c.gold
  ctx.fillText('مكتب وليد الكثيري للمحاماة والاستشارات القانونية', right, footY)

  ctx.font = '400 27px Tajawal, sans-serif'
  ctx.fillStyle = c.muted
  ctx.fillText('إب — شارع المحافظة، جوار صالة حدة', right, footY + 46)

  // النطاق في اليسار
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.font = '500 27px Tajawal, sans-serif'
  ctx.fillStyle = c.muted
  ctx.fillText('kathirilaw.com', PAD, footY + 46)
}

function Card({ post, tone }: { post: LegalPost; tone: Tone }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    // لا نرسم قبل جهوز الخطوط، وإلا رُسمت البطاقة بخطّ بديل
    const fonts: any = (document as any).fonts
    if (fonts && fonts.ready) {
      fonts.ready.then(() => draw(canvas, post, tone))
    } else {
      draw(canvas, post, tone)
    }
  }, [post, tone])

  function download() {
    const canvas = ref.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = post.id + '.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(post.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <canvas ref={ref} className="w-full h-auto block" style={{ aspectRatio: '1080 / 1350' }} />
      <div className="p-3 flex items-center gap-2 border-t border-slate-100">
        <button
          onClick={download}
          className="flex-1 text-xs bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition"
        >
          تنزيل الصورة
        </button>
        <button
          onClick={copyText}
          className={
            'flex-1 text-xs font-bold py-2.5 rounded-lg border transition ' +
            (copied
              ? 'border-emerald-600 text-emerald-700'
              : 'border-slate-200 text-slate-700 hover:border-slate-400')
          }
        >
          {copied ? 'نُسخ النص' : 'نسخ النص'}
        </button>
      </div>
      <p className="px-3 pb-3 text-[11px] text-slate-400 leading-relaxed">
        {post.law} · {post.articles}
      </p>
    </div>
  )
}

export default function CardStudio({ posts }: { posts: LegalPost[] }) {
  const [tone, setTone] = useState<Tone>('dark')

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-slate-900 text-sm">بطاقات المنشورات</h2>
            <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
              {posts.length} بطاقة بمقاس ١٠٨٠×١٣٥٠. الصورة تحمل نصّ المادة، والنصّ الكامل يُنسخ لوصف المنشور.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1 shrink-0">
            {(['dark', 'light'] as Tone[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={
                  'text-xs font-bold px-3.5 py-1.5 rounded-md transition ' +
                  (tone === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')
                }
              >
                {t === 'dark' ? 'داكنة' : 'فاتحة'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed space-y-1">
          <p>· انشر الصورة، وضع النصّ الكامل في الوصف.</p>
          <p>· ضع رابط الموقع في أول تعليق لا في المنشور — الروابط تخفض الانتشار.</p>
          <p>· لا تكتب «شاركوا المنشور»؛ يُصنَّف استجداءً للتفاعل ويُخفَّض.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Card key={p.id} post={p} tone={tone} />
        ))}
      </div>
    </div>
  )
}
