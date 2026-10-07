'use client'

import { useEffect, useState } from 'react'

export default function PwaInit() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (standalone) return
    if (localStorage.getItem('pwa-dismissed') === '1') return

    const onPrompt = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const ua = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua)
    if (isIos && !/CriOS|FxiOS/.test(ua)) {
      setIosHint(true)
      setShow(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    try { localStorage.setItem('pwa-dismissed', '1') } catch {}
    setShow(false)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-3 inset-x-3 z-50 bg-slate-900 text-slate-100 rounded-2xl shadow-xl p-4 flex items-center gap-3">
      <div className="flex-1">
        <p className="font-bold text-sm">ثبّت التطبيق على جهازك</p>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          {iosHint
            ? 'اضغط زر المشاركة في أسفل المتصفح، ثم اختر «إضافة إلى الشاشة الرئيسية».'
            : 'للوصول السريع واستقبال إشعارات الجلسات.'}
        </p>
      </div>
      {!iosHint && (
        <button onClick={install} className="shrink-0 text-xs font-bold bg-amber-500 text-slate-900 px-4 py-2 rounded-xl">
          تثبيت
        </button>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 text-slate-400 text-lg px-1">
        ✕
      </button>
    </div>
  )
}
