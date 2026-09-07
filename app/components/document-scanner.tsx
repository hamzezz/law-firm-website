'use client'

import { useState, useRef, useEffect } from 'react'

export default function DocumentScanner({ onCapture }: { onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'camera' | 'crop'>('camera')
  const [error, setError] = useState('')
  const [enhance, setEnhance] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const shotRef = useRef<HTMLImageElement | null>(null)

  const [crop, setCrop] = useState({ x: 5, y: 5, w: 90, h: 90 })
  const dragRef = useRef<{ corner: string | null; startX: number; startY: number; box: any }>({
    corner: null, startX: 0, startY: 0, box: null,
  })

  useEffect(() => () => stopCamera(), [])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function openScanner() {
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
      setCrop({ x: 5, y: 5, w: 90, h: 90 })
      setStage('crop')
      setTimeout(drawPreview, 50)
    }
    img.src = canvas.toDataURL('image/jpeg', 0.95)
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

  function pointerPos(e: React.PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  function startDrag(e: React.PointerEvent, corner: string) {
    e.preventDefault()
    e.stopPropagation()
    const wrap = (e.currentTarget as HTMLElement).parentElement
    if (!wrap) return
    const p = pointerPos(e, wrap)
    dragRef.current = { corner, startX: p.x, startY: p.y, box: { ...crop } }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onDrag(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.corner) return
    const p = pointerPos(e, e.currentTarget as HTMLElement)
    const dx = p.x - d.startX
    const dy = p.y - d.startY
    const b = d.box
    const MIN = 15
    let { x, y, w, h } = b

    if (d.corner === 'tl') {
      x = Math.min(Math.max(0, b.x + dx), b.x + b.w - MIN)
      y = Math.min(Math.max(0, b.y + dy), b.y + b.h - MIN)
      w = b.w - (x - b.x); h = b.h - (y - b.y)
    } else if (d.corner === 'tr') {
      y = Math.min(Math.max(0, b.y + dy), b.y + b.h - MIN)
      w = Math.max(MIN, Math.min(100 - b.x, b.w + dx)); h = b.h - (y - b.y)
    } else if (d.corner === 'bl') {
      x = Math.min(Math.max(0, b.x + dx), b.x + b.w - MIN)
      w = b.w - (x - b.x); h = Math.max(MIN, Math.min(100 - b.y, b.h + dy))
    } else {
      w = Math.max(MIN, Math.min(100 - b.x, b.w + dx))
      h = Math.max(MIN, Math.min(100 - b.y, b.h + dy))
    }
    setCrop({ x, y, w, h })
  }

  function endDrag() { dragRef.current.corner = null }

  function applyEnhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
    const threshold = (sum / (px.length / 4)) * 0.82

    for (let i = 0; i < px.length; i += 4) {
      const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
      let v = gray < threshold ? gray * 0.55 : 255 - (255 - gray) * 0.25
      v = Math.max(0, Math.min(255, v))
      px[i] = px[i + 1] = px[i + 2] = v
    }
    ctx.putImageData(data, 0, 0)
  }

  function confirmShot() {
    const img = shotRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const sx = (crop.x / 100) * img.width
    const sy = (crop.y / 100) * img.height
    const sw = (crop.w / 100) * img.width
    const sh = (crop.h / 100) * img.height

    canvas.width = Math.round(sw)
    canvas.height = Math.round(sh)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    if (enhance) applyEnhance(ctx, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      onCapture(new File([blob], 'محضر-' + new Date().toISOString().slice(0, 10) + '.jpg', { type: 'image/jpeg' }))
      closeScanner()
    }, 'image/jpeg', 0.9)
  }

  return (
    <>
      <button type="button" onClick={openScanner}
        className="text-xs font-bold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition w-full">
        📷 تصوير المحضر بالكاميرا
      </button>

      <canvas ref={canvasRef} className="hidden" />

      {open && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-bold">{stage === 'camera' ? 'صوّر المحضر' : 'حدّد حواف الورقة'}</span>
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
                <div className="absolute border-2 border-amber-400 bg-amber-400/10 pointer-events-none"
                  style={{ left: crop.x + '%', top: crop.y + '%', width: crop.w + '%', height: crop.h + '%' }} />
                {[
                  { k: 'tl', s: { left: crop.x + '%', top: crop.y + '%' } },
                  { k: 'tr', s: { left: crop.x + crop.w + '%', top: crop.y + '%' } },
                  { k: 'bl', s: { left: crop.x + '%', top: crop.y + crop.h + '%' } },
                  { k: 'br', s: { left: crop.x + crop.w + '%', top: crop.y + crop.h + '%' } },
                ].map((c) => (
                  <div key={c.k} onPointerDown={(e) => startDrag(e, c.k)}
                    className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 border-2 border-white shadow-lg touch-none"
                    style={c.s as any} />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
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
                  <button onClick={confirmShot} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl text-sm">استخدام الصورة</button>
                  <button onClick={openScanner} className="px-5 py-3 rounded-xl border border-white/25 text-white/80 text-sm">إعادة</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
