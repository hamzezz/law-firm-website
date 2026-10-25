import { parseArticle } from '@/lib/articles/parse'

/**
 * عرض متن المقال ببنيةٍ مقروءة.
 *
 * كان المتن كلّه يُعرض في وسم <p> واحد، فتستوي العناوين ونصوص المواد
 * والفقرات في الحجم واللون. وهنا يُفصل كلٌّ عن الآخر.
 */
export default function ArticleBody({ content }: { content: string }) {
  const { blocks } = parseArticle(content)

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <h2
              key={i}
              id={b.id}
              className="font-display font-bold text-slate-900 text-xl md:text-[22px] leading-snug pt-4 scroll-mt-24"
            >
              <span className="inline-block w-8 h-[3px] bg-amber-500 align-middle ml-3 rounded-full" />
              {b.text}
            </h2>
          )
        }

        if (b.kind === 'quote') {
          return (
            <blockquote
              key={i}
              className="border-r-4 border-amber-500 bg-amber-50/60 rounded-l-xl py-4 pr-5 pl-5 text-slate-800 leading-[2.1] text-[15px] md:text-base"
            >
              {b.text}
            </blockquote>
          )
        }

        if (b.kind === 'list') {
          return (
            <ul key={i} className="space-y-2.5 pr-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-slate-700 leading-[2] text-[15px] md:text-base">
                  <span className="mt-[14px] w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          )
        }

        if (b.kind === 'refs') {
          return (
            <aside key={i} className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-display font-bold text-slate-900 text-sm mb-3">المراجع</h3>
              <ul className="space-y-2">
                {b.items.map((item, j) => (
                  <li key={j} className="text-slate-600 text-[13px] leading-relaxed">{item}</li>
                ))}
              </ul>
            </aside>
          )
        }

        return (
          <p key={i} className="text-slate-700 leading-[2.15] text-[15px] md:text-[17px]">
            {b.segments.map((s, j) =>
              s.q ? (
                <span key={j} className="text-slate-900 font-medium decoration-amber-300 decoration-2 underline underline-offset-[6px]">
                  {s.t}
                </span>
              ) : (
                <span key={j}>{s.t}</span>
              )
            )}
          </p>
        )
      })}
    </div>
  )
}
