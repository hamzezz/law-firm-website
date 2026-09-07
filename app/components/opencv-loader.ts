/**
 * تحميل OpenCV.js عند الطلب فقط.
 * لا يُنزَّل مع فتح النظام، بل عند أول استخدام لميزة التصحيح التلقائي،
 * ثم يبقى في ذاكرة المتصفح للمرات التالية.
 */

let loadPromise: Promise<any> | null = null

export function loadOpenCV(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('غير متاح'))

  const w = window as any
  if (w.cv && w.cv.Mat) return Promise.resolve(w.cv)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.10.0/opencv.js'
    script.async = true

    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة التحميل — تحقق من الاتصال'))
    }, 90000)

    script.onload = () => {
      const check = () => {
        const cv = (window as any).cv
        if (cv && cv.Mat) {
          clearTimeout(timeout)
          resolve(cv)
        } else if (cv && typeof cv.then === 'function') {
          cv.then((m: any) => {
            clearTimeout(timeout)
            ;(window as any).cv = m
            resolve(m)
          })
        } else {
          setTimeout(check, 120)
        }
      }
      check()
    }

    script.onerror = () => {
      clearTimeout(timeout)
      loadPromise = null
      reject(new Error('تعذّر تحميل مكتبة المعالجة'))
    }

    document.body.appendChild(script)
  })

  return loadPromise
}
