'use client'

import { useEffect, useState } from 'react'

/**
 * يُثبّت التبويب المفتوح في الرابط.
 *
 * كان التبويب في ذاكرة المكوّن وحده، فإذا فتح المستخدم قضيةً ثم ضغط
 * الرجوع عاد إلى التبويب الافتراضي لا إلى الذي كان فيه. وبتثبيته في
 * الرابط يحفظه المتصفّح في سجلّ التنقّل، فيعود الرجوع إلى موضعه.
 *
 * ويُستعمل replaceState لا pushState، كي لا يمتلئ سجلّ التنقّل بضغطات
 * التبويبات فيحتاج المستخدم إلى الرجوع مرّاتٍ ليخرج من الصفحة.
 */
export function useHashTab<T extends string>(valid: readonly T[], fallback: T) {
  const [tab, setTab] = useState<T>(fallback)

  useEffect(() => {
    function read() {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ''))
      if (h && (valid as readonly string[]).indexOf(h) !== -1) {
        setTab(h as T)
      }
    }

    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
    // يُقرأ مرّة عند التركيب، والمستمع يتكفّل بالرجوع والتقدّم
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(next: T) {
    setTab(next)
    try {
      window.history.replaceState(null, '', '#' + next)
    } catch {
      // بعض المتصفّحات تمنع تعديل السجلّ في سياقات معيّنة، والتبويب يعمل بدونه
    }
  }

  return [tab, go] as const
}
