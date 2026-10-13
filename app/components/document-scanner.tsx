'use client'

import { useState, useRef, useEffect } from 'react'

/** نقطة بالنسبة المئوية من أبعاد الصورة */
type Pt = { x: number; y: number }
/** الزوايا الأربع بترتيب ثابت: أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار */
type Quad = [Pt, Pt, Pt, Pt]

const DEFAULT_QUAD: Quad = [
  { x: 6, y: 6 }, { x: 94, y: 6 }, { x: 94, y: 94 }, { x: 6, y: 94 },
]

export default function DocumentScanner({ onCapture }: { onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'camera' | 'crop'>('camera')
  const [error, setError] = useState('')
  const [enhance, setEnhance] = useState(true)
  const [autoDetected, setAutoDetected] = useState(false)
  const [working, setWorking] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const shotRef = useRef<HTMLImageElement | null>(null)

  const [quad, setQuad] = useState<Quad>(DEFAULT_QUAD)
  const [nativeError, setNativeError] = useState('')
  const dragRef = useRef<{ i: number | null }>({ i: null })

  /**
   * داخل تطبيق أندرويد يتوفّر ماسح جوجل الأصلي (ML Kit) عبر جسر Capacitor.
   * نستعمله حين يكون موجوداً، ونرجع إلى الماسح المدمج في المتصفّح وعلى الآيفون.
   */
  function nativeScanner(): any {
    if (typeof window === 'undefined') return null
    const cap: any = (window as any).Capacitor
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null
    if (!cap.Plugins || !cap.Plugins.DocumentScanner || !cap.convertFileSrc) return null
    return cap
  }

  function fileName(ext: string) {
    return 'محضر-' + new Date().toISOString().slice(0, 10) + '.' + ext
  }

  async function openNativeScanner(cap: any) {
    setNativeError('')
    try {
      // محضر الجلسة مستند واحد مهما تعدّدت صفحاته، فنُخرجه PDF لا صوراً متفرّقة
      const res = await cap.Plugins.DocumentScanner.scanDocument({
        resultFormats: 'PDF',
        pageLimit: 20,
        scannerMode: 'FULL',
        galleryImportAllowed: true,
      })

      const uri = res && res.pdf && res.pdf.uri
      if (!uri) return // ألغى المستخدم

      const r = await fetch(cap.convertFileSrc(uri))
      if (!r.ok) throw new Error('status ' + r.status)
      const blob = await r.blob()

      onCapture(new File([blob], fileName('pdf'), { type: 'application/pdf' }))
    } catch (e: any) {
      const msg = e && e.message ? String(e.message) : ''
      // الإلغاء يرجع كخطأ أيضاً، ولا داعي لإزعاج المستخدم به
      if (/cancel/i.test(msg)) return
      setNativeError('تعذّر فتح الماسح. ' + (msg || 'حاول مرة أخرى.'))
    }
  }

  useEffect(() => () => stopCamera(), [])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function openScanner() {
    // داخل التطبيق: ماسح جوجل الأصلي. خارجه: الماسح المدمج أدناه.
    const cap = nativeScanner()
    if (cap) { openNativeScanner(cap); return }

    setError('')
    setStage('camera')
    setOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1920 } },
      })
      streamRef.current = stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 60)
    } catch {
      setError('تعذّر فتح الكاميرا. تأكد من منح الإذن، ومن فتح الموقع عبر https.')
    }
  }

  function closeScanner() {
    stopCamera()
    setOpen(false)
    setStage('camera')
    setError('')
    setWorking(false)
  }

  function takeShot() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      setError('الكاميرا لم تجهز بعد، حاول مرة أخرى.')
      return
    }
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)

    const img = new Image()
    img.onload = () => {
      shotRef.current = img
      stopCamera()
      const detected = detectEdges(img)
      setQuad(detected || DEFAULT_QUAD)
      setAutoDetected(!!detected)
      setStage('crop')
      setTimeout(drawPreview, 50)
    }
    img.src = canvas.toDataURL('image/jpeg', 0.95)
  }

  /**
   * اقتراح أوّلي لموضع الورقة بمسح خفيف للسطوع.
   * يعطي مستطيلاً قائماً فحسب، فهو مجرّد نقطة بداية تُصحَّح بسحب الزوايا:
   * الدقّة النهائية تأتي من تصحيح المنظور في confirmShot لا من هنا.
   */
  function detectEdges(img: HTMLImageElement): Quad | null {
    try {
      const W = 160
      const H = Math.max(1, Math.round((img.height / img.width) * W))
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(img, 0, 0, W, H)
      const px = ctx.getImageData(0, 0, W, H).data

      const gray = (x: number, y: number) => {
        const i = (y * W + x) * 4
        return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
      }

      // سطوع الخلفية: متوسط الإطار الخارجي
      let bg = 0, n = 0
      for (let x = 0; x < W; x++) { bg += gray(x, 0) + gray(x, H - 1); n += 2 }
      for (let y = 0; y < H; y++) { bg += gray(0, y) + gray(W - 1, y); n += 2 }
      bg /= n

      // عتبات متدرّجة: الصارمة أدق، والمتساهلة تنقذ الخلفيات الفاتحة
      const tryDetect = (DIFF: number, RATIO: number) => {
        const isPaper = (v: number) => Math.abs(v - bg) > DIFF
        const colHit = (x: number) => {
          let hits = 0
          for (let y = 0; y < H; y++) if (isPaper(gray(x, y))) hits++
          return hits / H
        }
        const rowHit = (y: number) => {
          let hits = 0
          for (let x = 0; x < W; x++) if (isPaper(gray(x, y))) hits++
          return hits / W
        }
        let left = 0, right = W - 1, top = 0, bottom = H - 1
        while (left < W - 1 && colHit(left) < RATIO) left++
        while (right > left && colHit(right) < RATIO) right--
        while (top < H - 1 && rowHit(top) < RATIO) top++
        while (bottom > top && rowHit(bottom) < RATIO) bottom--

        const w = ((right - left) / W) * 100
        const h = ((bottom - top) / H) * 100
        if (w < 20 || h < 20 || (w > 98 && h > 98)) return null

        const pad = 1
        const x0 = Math.max(0, (left / W) * 100 - pad)
        const y0 = Math.max(0, (top / H) * 100 - pad)
        const x1 = Math.min(100, x0 + w + pad * 2)
        const y1 = Math.min(100, y0 + h + pad * 2)
        return [
          { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
        ] as Quad
      }

      return tryDetect(26, 0.35) || tryDetect(15, 0.25) || tryDetect(9, 0.18)
    } catch {
      return null
    }
  }

  function drawPreview() {
    const img = shotRef.current
    const canvas = previewRef.current
    if (!img || !canvas) return
    const scale = Math.min(1, 520 / img.width)
    canvas.width = img.width * scale
    canvas.height = img.height * scale
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    if (stage === 'crop') drawPreview()
  }, [stage])

  /* ——— سحب كل زاوية وحدها ——— */
  function startDrag(e: React.PointerEvent, i: number) {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current.i = i
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDrag(e: React.PointerEvent) {
    const i = dragRef.current.i
    if (i === null) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100))
    setQuad((q) => {
      const next = q.slice() as Quad
      next[i] = { x, y }
      return next
    })
  }

  function endDrag() { dragRef.current.i = null }

  /**
   * تحسين وضوح المستند بعتبة محلية تكيّفية.
   * نقارن كل بكسل بمتوسط سطوع محيطه لا بمتوسط الصورة كلها، فلا تُحرق
   * المناطق المضيئة ولا تُطمس المظلمة عند الإضاءة غير المتساوية.
   */
  function applyEnhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    const n = w * h

    const gray = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const j = i * 4
      gray[i] = px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114
    }

    const integral = new Float64Array((w + 1) * (h + 1))
    for (let y = 0; y < h; y++) {
      let rowSum = 0
      for (let x = 0; x < w; x++) {
        rowSum += gray[y * w + x]
        integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum
      }
    }

    const radius = Math.max(8, Math.floor(w * 0.06))
    const T = 0.86

    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - radius)
      const y2 = Math.min(h - 1, y + radius)
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - radius)
        const x2 = Math.min(w - 1, x + radius)
        const area = (x2 - x1 + 1) * (y2 - y1 + 1)

        const sum =
          integral[(y2 + 1) * (w + 1) + (x2 + 1)] -
          integral[y1 * (w + 1) + (x2 + 1)] -
          integral[(y2 + 1) * (w + 1) + x1] +
          integral[y1 * (w + 1) + x1]

        const localMean = sum / area
        const v = gray[y * w + x]
        const j = (y * w + x) * 4

        let out: number
        if (v < localMean * T) {
          out = Math.max(0, v * 0.5)
        } else {
          out = Math.min(255, 255 - (255 - v) * 0.35)
        }
        px[j] = px[j + 1] = px[j + 2] = out
      }
    }

    ctx.putImageData(data, 0, 0)
  }

  /**
   * حلّ جملة خطّية بالحذف الغاوسي مع محور جزئي.
   * تُستعمل لإيجاد مصفوفة التحويل الإسقاطي من ثماني معادلات.
   */
  function solve(A: number[][], b: number[]): number[] | null {
    const n = b.length
    for (let col = 0; col < n; col++) {
      let piv = col
      for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r
      if (Math.abs(A[piv][col]) < 1e-10) return null
      if (piv !== col) {
        const t = A[piv]; A[piv] = A[col]; A[col] = t
        const tb = b[piv]; b[piv] = b[col]; b[col] = tb
      }
      for (let r = col + 1; r < n; r++) {
        const f = A[r][col] / A[col][col]
        if (!f) continue
        for (let c = col; c < n; c++) A[r][c] -= f * A[col][c]
        b[r] -= f * b[col]
      }
    }
    const x = new Array(n).fill(0)
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r]
      for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c]
      x[r] = s / A[r][r]
    }
    return x
  }

  /**
   * تصحيح المنظور: يحوّل الشكل الرباعي المائل الذي حدّدته إلى مستطيل مستوٍ.
   * نحسب التحويل الإسقاطي من وجهة الخرج إلى مصدر الصورة (تخطيط عكسي)،
   * ثم نملأ كل بكسل في الخرج بأخذ عيّنة ثنائية الخطّية من موضعه في الأصل،
   * فلا تظهر فجوات ولا تُسنَّن الحواف.
   */
  function warp(
    img: HTMLImageElement,
    src: { x: number; y: number }[],
    outW: number,
    outH: number
  ): HTMLCanvasElement | null {
    const sc = document.createElement('canvas')
    sc.width = img.width; sc.height = img.height
    const sctx = sc.getContext('2d', { willReadFrequently: true })
    if (!sctx) return null
    sctx.drawImage(img, 0, 0)
    const sdata = sctx.getImageData(0, 0, img.width, img.height).data
    const sw = img.width, sh = img.height

    const dst = [ { x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH } ]

    const A: number[][] = []
    const b: number[] = []
    for (let i = 0; i < 4; i++) {
      const { x: dx, y: dy } = dst[i]
      const { x: ux, y: uy } = src[i]
      A.push([dx, dy, 1, 0, 0, 0, -dx * ux, -dy * ux]); b.push(ux)
      A.push([0, 0, 0, dx, dy, 1, -dx * uy, -dy * uy]); b.push(uy)
    }
    const h = solve(A, b)
    if (!h) return null
    const [a1, a2, a3, a4, a5, a6, a7, a8] = h

    const oc = document.createElement('canvas')
    oc.width = outW; oc.height = outH
    const octx = oc.getContext('2d')
    if (!octx) return null
    const out = octx.createImageData(outW, outH)
    const o = out.data

    for (let y = 0; y < outH; y++) {
      for (let x = 0; x < outW; x++) {
        const den = a7 * x + a8 * y + 1
        const ux = (a1 * x + a2 * y + a3) / den
        const uy = (a4 * x + a5 * y + a6) / den
        const j = (y * outW + x) * 4

        if (ux < 0 || uy < 0 || ux > sw - 1 || uy > sh - 1) {
          o[j] = o[j + 1] = o[j + 2] = 255; o[j + 3] = 255
          continue
        }

        const x0 = Math.floor(ux), y0 = Math.floor(uy)
        const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1)
        const fx = ux - x0, fy = uy - y0
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy)
        const w01 = (1 - fx) * fy, w11 = fx * fy
        const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4
        const i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4

        for (let k = 0; k < 3; k++) {
          o[j + k] = sdata[i00 + k] * w00 + sdata[i10 + k] * w10 + sdata[i01 + k] * w01 + sdata[i11 + k] * w11
        }
        o[j + 3] = 255
      }
    }

    octx.putImageData(out, 0, 0)
    return oc
  }

  function confirmShot() {
    const img = shotRef.current
    if (!img || working) return
    setWorking(true)

    // ننتظر إطاراً حتى تظهر حالة "جارٍ المعالجة" قبل أن يحجز الحساب الخيط
    setTimeout(() => {
      try {
        const src = quad.map((p) => ({ x: (p.x / 100) * img.width, y: (p.y / 100) * img.height }))
        const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

        // أبعاد الخرج من أطول ضلعين متقابلين، حفاظاً على نسبة الورقة
        let outW = Math.max(dist(src[0], src[1]), dist(src[3], src[2]))
        let outH = Math.max(dist(src[0], src[3]), dist(src[1], src[2]))

        const MAX_WIDTH = 1800
        if (outW > MAX_WIDTH) {
          outH = (outH * MAX_WIDTH) / outW
          outW = MAX_WIDTH
        }
        outW = Math.max(1, Math.round(outW))
        outH = Math.max(1, Math.round(outH))

        const oc = warp(img, src, outW, outH)
        if (!oc) {
          setError('تعذّرت معالجة الصورة. حرّك إحدى الزوايا وأعد المحاولة.')
          setWorking(false)
          return
        }

        const octx = oc.getContext('2d')
        if (octx && enhance) applyEnhance(octx, oc.width, oc.height)

        oc.toBlob((blob) => {
          if (!blob) { setWorking(false); return }
          onCapture(new File([blob], 'محضر-' + new Date().toISOString().slice(0, 10) + '.jpg', { type: 'image/jpeg' }))
          closeScanner()
        }, 'image/jpeg', 0.85)
      } catch {
        setError('تعذّرت معالجة الصورة. أعد الالتقاط.')
        setWorking(false)
      }
    }, 30)
  }

  const points = quad.map((p) => p.x + ',' + p.y).join(' ')

  return (
    <>
      <button type="button" onClick={openScanner}
        className="text-xs font-bold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition w-full">
        📷 تصوير المحضر بالكاميرا
      </button>

      {nativeError && (
        <p className="text-[11px] text-red-600 mt-2">{nativeError}</p>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {open && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-bold">{stage === 'camera' ? 'صوّر المحضر' : 'ضع الزوايا على حواف الورقة'}</span>
            <button onClick={closeScanner} className="text-white/70 hover:text-white text-lg px-2">✕</button>
          </div>

          {error && <div className="mx-4 mb-2 bg-red-50 text-red-700 text-xs p-3 rounded-lg">{error}</div>}

          <div className="flex-1 flex items-center justify-center px-3 overflow-hidden">
            {stage === 'camera' ? (
              <video ref={videoRef} playsInline muted className="max-w-full max-h-full rounded-lg" />
            ) : (
              <div className="relative inline-block touch-none"
                onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
                <canvas ref={previewRef} className="max-w-full max-h-[65vh] rounded-lg block" />

                <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none">
                  <polygon points={points} fill="rgba(251,191,36,0.14)" stroke="#fbbf24"
                    strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                </svg>

                {quad.map((p, i) => (
                  <div key={i} onPointerDown={(e) => startDrag(e, i)}
                    className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 border-2 border-white shadow-lg touch-none"
                    style={{ left: p.x + '%', top: p.y + '%' }} />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {stage === 'crop' && (
              <p className="text-center text-[11px] text-white/60">
                {autoDetected
                  ? 'اقتراح أوّلي — صحّح الزوايا الأربع على حواف الورقة'
                  : 'اسحب كل زاوية إلى ركن الورقة المقابل'}
              </p>
            )}

            {stage === 'crop' && (
              <label className="flex items-center justify-center gap-2 text-white/80 text-xs">
                <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} className="w-4 h-4" />
                تحسين الوضوح
              </label>
            )}

            <div className="flex gap-2">
              {stage === 'camera' ? (
                <button onClick={takeShot} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl text-sm">التقاط</button>
              ) : (
                <>
                  <button onClick={confirmShot} disabled={working}
                    className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60">
                    {working ? 'جارٍ المعالجة…' : 'استخدام الصورة'}
                  </button>
                  <button onClick={openScanner} disabled={working}
                    className="px-5 py-3 rounded-xl border border-white/25 text-white/80 text-sm disabled:opacity-60">إعادة</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
