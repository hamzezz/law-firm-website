/**
 * جدول محتويات المقال.
 *
 * يُبنى من العناوين التي استخرجها المحلّل، فلا يحتاج إلى عملٍ من الكاتب.
 * ولا يظهر إن كان المقال أقلّ من ثلاثة مباحث، لأنه حينها زينةٌ لا فائدة.
 */
export default function ArticleToc({
  headings,
}: {
  headings: { id: string; text: string }[]
}) {
  if (headings.length < 3) return null

  return (
    <nav aria-label="محتويات المقال" className="text-sm">
      <h2 className="font-display font-bold text-slate-900 text-[13px] mb-3 flex items-center gap-2">
        <span className="w-5 h-[2px] bg-amber-500 rounded-full" />
        في هذا المقال
      </h2>
      <ol className="space-y-2 border-r border-slate-200 pr-4">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={'#' + h.id}
              className="block text-slate-500 hover:text-slate-900 leading-relaxed text-[13px] transition"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
