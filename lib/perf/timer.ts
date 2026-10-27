/**
 * مؤقّت تشخيصي مؤقّت.
 *
 * يطبع في سجلّ الخادم زمن كل مرحلة من مراحل تحضير الصفحة، لنعرف أين
 * يذهب الوقت بدل التخمين. لا أثر له في الواجهة، ويُحذف بعد التشخيص.
 *
 * يُفعَّل بمتغيّر البيئة PERF_LOG=1 فقط، فلا يُثقل السجلّ إن نُسي.
 */
const ENABLED = process.env.PERF_LOG === '1'

export function startTimer(label: string) {
  if (!ENABLED) {
    return { mark(_name: string) {}, end() {} }
  }

  const t0 = Date.now()
  let last = t0
  const parts: string[] = []

  return {
    /** يسجّل زمن المرحلة منذ المرحلة السابقة */
    mark(name: string) {
      const now = Date.now()
      parts.push(name + '=' + (now - last) + 'ms')
      last = now
    },
    end() {
      const total = Date.now() - t0
      console.log('[perf] ' + label + ' :: ' + parts.join('  ') + '  :: الإجمالي=' + total + 'ms')
    },
  }
}
