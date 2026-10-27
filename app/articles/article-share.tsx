'use client'

import { useState } from 'react'

/**
 * أزرار المشاركة. واتساب أوّلها لأنه الأوسع استعمالاً عند جمهور المكتب،
 * ونسخ الرابط آخرها لمن يريد لصقه في مكانٍ آخر.
 */
export default function ArticleShare({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // بعض المتصفّحات تمنع الحافظة؛ يبقى الرابط ظاهراً في شريط العنوان
      setCopied(false)
    }
  }

  const text = encodeURIComponent(title + ' — ' + url)
  const enc = encodeURIComponent(url)

  const btn =
    'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 ' +
    'text-slate-600 text-[13px] hover:border-amber-300 hover:text-slate-900 transition'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-slate-400 text-[13px] ml-1">مشاركة:</span>

      <a className={btn} href={'https://wa.me/?text=' + text} target="_blank" rel="noopener noreferrer">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3a2.9 2.9 0 00-.9 2.1c0 1.3.9 2.5 1 2.6a9.6 9.6 0 003.7 3.2c1.4.6 1.9.6 2.6.5.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z" />
        </svg>
        واتساب
      </a>

      <a className={btn} href={'https://t.me/share/url?url=' + enc + '&text=' + encodeURIComponent(title)} target="_blank" rel="noopener noreferrer">
        تيليجرام
      </a>

      <a className={btn} href={'https://www.facebook.com/sharer/sharer.php?u=' + enc} target="_blank" rel="noopener noreferrer">
        فيسبوك
      </a>

      <button type="button" onClick={copy} className={btn}>
        {copied ? 'نُسخ الرابط' : 'نسخ الرابط'}
      </button>
    </div>
  )
}
