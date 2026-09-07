import { loadOpenCV } from './opencv-loader'

export type Corner = { x: number; y: number }

/**
 * يكشف حواف الورقة في الصورة ويعيد زواياها الأربع بالبكسل.
 * الطريقة: تنعيم ← كشف حواف Canny ← إيجاد المحيطات ← اختيار أكبر
 * مضلّع رباعي مساحته معقولة. يعيد null إن لم يجد شكلاً مقنعاً.
 */
export async function detectCorners(source: HTMLCanvasElement): Promise<Corner[] | null> {
  const cv = await loadOpenCV()

  const src = cv.imread(source)
  const gray = new cv.Mat()
  const blur = new cv.Mat()
  const edges = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0)
    cv.Canny(blur, edges, 60, 160)

    // توسيع الحواف لسدّ الفجوات في الخطوط المتقطعة
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    cv.dilate(edges, edges, kernel)
    kernel.delete()

    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const imgArea = src.rows * src.cols
    let best: Corner[] | null = null
    let bestArea = 0

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const peri = cv.arcLength(cnt, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true)

      if (approx.rows === 4) {
        const area = Math.abs(cv.contourArea(approx))
        // نقبل ما بين 20% و 99% من مساحة الصورة
        if (area > imgArea * 0.2 && area < imgArea * 0.99 && area > bestArea) {
          const pts: Corner[] = []
          for (let j = 0; j < 4; j++) {
            pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] })
          }
          if (cv.isContourConvex(approx)) {
            bestArea = area
            best = pts
          }
        }
      }
      approx.delete()
      cnt.delete()
    }

    return best ? orderCorners(best) : null
  } finally {
    src.delete(); gray.delete(); blur.delete()
    edges.delete(); contours.delete(); hierarchy.delete()
  }
}

/** ترتيب الزوايا: أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار */
export function orderCorners(pts: Corner[]): Corner[] {
  const sum = pts.map((p) => p.x + p.y)
  const diff = pts.map((p) => p.y - p.x)
  return [
    pts[sum.indexOf(Math.min(...sum))],
    pts[diff.indexOf(Math.min(...diff))],
    pts[sum.indexOf(Math.max(...sum))],
    pts[diff.indexOf(Math.max(...diff))],
  ]
}

/**
 * تصحيح المنظور: يحوّل الورقة المائلة إلى مستطيل مستوٍ.
 * يرسم النتيجة في canvas الهدف.
 */
export async function warpToRect(
  source: HTMLCanvasElement,
  corners: Corner[],
  target: HTMLCanvasElement
): Promise<void> {
  const cv = await loadOpenCV()
  const [tl, tr, br, bl] = orderCorners(corners)

  const dist = (a: Corner, b: Corner) => Math.hypot(a.x - b.x, a.y - b.y)
  const width = Math.round(Math.max(dist(tl, tr), dist(bl, br)))
  const height = Math.round(Math.max(dist(tl, bl), dist(tr, br)))

  const src = cv.imread(source)
  const dst = new cv.Mat()

  const from = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height])
  const M = cv.getPerspectiveTransform(from, to)

  try {
    cv.warpPerspective(src, dst, M, new cv.Size(width, height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
    target.width = width
    target.height = height
    cv.imshow(target, dst)
  } finally {
    src.delete(); dst.delete(); from.delete(); to.delete(); M.delete()
  }
}
