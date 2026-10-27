import { createClient } from '@/lib/supabase/server'

export const revalidate = 86400

const HEAD = `# مكتب وليد الكثيري للمحاماة والاستشارات القانونية والتحكيم

> مكتب محاماة في محافظة إب، الجمهورية اليمنية. يمثّل موكليه من الأفراد والشركات أمام مختلف درجات المحاكم والنيابات، ويتابع قضايا المغتربين اليمنيين داخل اليمن بموجب وكالات شرعية.

## معلومات التواصل

- الموقع: https://kathirilaw.com
- العنوان: شارع المحافظة، جوار صالة حدة، أمام جامع المحافظة، مدينة إب، محافظة إب، الجمهورية اليمنية
- الهاتف وواتساب: +967771774502
- البريد الإلكتروني: alkathirilawfirm@gmail.com
- ساعات العمل: من السبت إلى الخميس، من الواحدة ظهراً حتى العاشرة مساءً بتوقيت اليمن
- لغة العمل: العربية

## المحامي

وليد الكثيري — محامٍ ومستشار قانوني.
- بكالوريوس الشريعة والقانون
- يمارس مهنة المحاماة منذ عام 2009
- مقيّد مترافعاً أمام المحكمة العليا منذ عام 2023
- عضو في اتحاد المحامين العرب

## مجالات الممارسة

- القضاء الجنائي — https://kathirilaw.com/specialties/criminal
  تمثيل المتهمين والمجني عليهم أمام النيابة العامة ومحاكم الدرجة الأولى والاستئناف، وحضور التحقيق، وإعداد المذكرات الدفاعية، والطعن في الأحكام.
- الشركات والقضايا التجارية — https://kathirilaw.com/specialties/commercial
  تأسيس الشركات وصياغة عقودها، والترافع في المنازعات التجارية ودعاوى الشيكات وتحصيل المديونيات والإفلاس.
- الأحوال الشخصية والمواريث — https://kathirilaw.com/specialties/personal-status
  التركات والقسمة والفرز، وإثبات الوصايا والأوقاف، والنفقة والحضانة، وشؤون المغتربين بوكالات شرعية.
- القضاء المدني — https://kathirilaw.com/specialties/civil
  العقود والالتزامات، وإثبات الملكية والحيازة، ودعاوى العقارات والأراضي والإيجارات، والتعويض عن الأضرار، والتنفيذ.
- القضاء الإداري — https://kathirilaw.com/specialties/administrative
  الطعن في القرارات الإدارية، ومنازعات الوظيفة العامة، ومراجعة العقود الإدارية.
- التحكيم والوسائل البديلة — https://kathirilaw.com/specialties/arbitration
  تمثيل الأطراف في التحكيم التجاري والمدني، وصياغة شروط التحكيم، وتسوية النزاعات ودياً.

## خدمة المغتربين

https://kathirilaw.com/expats

يستطيع اليمنيون المقيمون خارج البلاد، ومنهم المقيمون في السعودية والولايات المتحدة، توكيل المكتب لمتابعة قضاياهم داخل اليمن. يصدر الموكل توكيلاً شرعياً من أقرب سفارة أو قنصلية يمنية بصيغة يزوّده بها المكتب، ثم يرسل الأصل الورقي إلى اليمن، ويتابع سير قضيته عبر بوابة الموكلين الإلكترونية دون حاجة إلى السفر.

## الصفحات الرئيسية

- الصفحة الرئيسية — https://kathirilaw.com
- عن المكتب — https://kathirilaw.com/about
- المكتبة القانونية — https://kathirilaw.com/articles
- خدمة المغتربين — https://kathirilaw.com/expats
- بوابة الموكلين — https://kathirilaw.com/client/login

`

const TAIL = `## ملاحظات

- المحتوى المنشور للتوعية القانونية العامة، ولا يُغني عن استشارة قانونية في واقعة بعينها.
- يلتزم المكتب بآداب مهنة المحاماة وأنظمة نقابة المحامين اليمنيين، فلا يعلن عن نتائج مضمونة ولا يذكر تفاصيل موكليه.
- مقالات المكتبة القانونية تنقل نصّ المادة من القانون المنشور نفسه، وتذكر رقم القانون وسنته وما لحقه من تعديل.
`

/**
 * قائمة المقالات المنشورة.
 *
 * الغاية أن ترى محرّكات الإجابة المكتبة القانونية لا تعريف المكتب وحده،
 * فتُحيل إلى المقال بعينه حين تُسأل عن مسألةٍ عالجها.
 */
async function articlesSection(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('articles')
      .select('slug, title, excerpt, category, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(100)

    if (!data || data.length === 0) return ''

    const lines = data.map((a: any) => {
      const url = 'https://kathirilaw.com/articles/' + encodeURIComponent(a.slug)
      const cat = a.category ? ' [' + a.category + ']' : ''
      const sum = a.excerpt ? '\n  ' + String(a.excerpt).replace(/\s+/g, ' ').trim() : ''
      return '- ' + a.title + cat + ' — ' + url + sum
    })

    return '## المكتبة القانونية\n\n' + lines.join('\n') + '\n\n'
  } catch {
    // إن تعذّر الوصول لقاعدة البيانات يبقى الملفّ صالحاً بدون قائمة المقالات
    return ''
  }
}

export async function GET() {
  const body = HEAD + (await articlesSection()) + TAIL

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
