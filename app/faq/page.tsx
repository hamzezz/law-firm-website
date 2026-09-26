import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumbs, FaqSchema } from '../components/page-schema'
import MobileNav from '../components/mobile-nav'

const WHATSAPP =
  'https://wa.me/967771774502?text=' +
  encodeURIComponent('السلام عليكم، أرغب في التواصل مع مكتب وليد الكثيري للمحاماة بخصوص استفسار قانوني.')

export const metadata = {
  title: 'أسئلة شائعة — مكتب وليد الكثيري للمحاماة في إب',
  description:
    'إجابات عن أكثر ما يسأل عنه الموكلون: أتعاب المحاماة، ومدة القضية، والمستندات المطلوبة، ومتابعة القضية عن بُعد، وموقع المكتب وساعات عمله في محافظة إب.',
  alternates: { canonical: 'https://kathirilaw.com/faq' },
  openGraph: {
    title: 'أسئلة شائعة — مكتب وليد الكثيري للمحاماة',
    description: 'إجابات عن أكثر ما يسأل عنه الموكلون في مكتب وليد الكثيري للمحاماة بمحافظة إب.',
    url: 'https://kathirilaw.com/faq',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const FAQ = [
  {
    q: 'أين يقع المكتب وما ساعات العمل؟',
    a: 'يقع المكتب في مدينة إب، شارع المحافظة، جوار صالة حدة، أمام جامع المحافظة. وساعات العمل من السبت إلى الخميس، من الواحدة ظهراً حتى العاشرة مساءً.',
  },
  {
    q: 'كيف تُحتسب أتعاب المحاماة؟',
    a: 'تُحتسب الأتعاب على أساس جلسات القضية، ويُتفق على المبلغ مع الموكل مسبقاً قبل مباشرة الإجراءات، فلا مفاجآت لاحقة.',
  },
  {
    q: 'ما المستندات التي أحضرها في الزيارة الأولى؟',
    a: 'أحضر ملف القضية الأولي: الوثائق المتعلقة بالنزاع، وأي أوراق سابقة صادرة من المحكمة إن وُجدت. وقد يطلب المكتب مستندات إضافية بعد دراسة القضية.',
  },
  {
    q: 'كم تستغرق القضية حتى صدور الحكم؟',
    a: 'تختلف المدة باختلاف نوع القضية والمحكمة المنظورة أمامها وظروف سيرها، فلا يمكن تحديد مدة ثابتة. ويُطلع المكتب موكليه على تقدير مبدئي بعد دراسة القضية، ويحيطهم بمستجداتها أولاً بأول.',
  },
  {
    q: 'هل يمكنني متابعة قضيتي دون الحضور إلى المكتب؟',
    a: 'نعم. لكل موكل حساب في بوابة الموكلين يعرض قضاياه ومواعيد جلساتها القادمة وقرارات الجلسات السابقة ومحاضرها، متاح من أي جهاز وفي أي وقت دون تثبيت أي تطبيق.',
  },
  {
    q: 'أنا مغترب، هل يمكنكم متابعة قضيتي داخل اليمن؟',
    a: 'نعم. يصدر الموكل توكيلاً شرعياً من أقرب سفارة أو قنصلية يمنية في بلد إقامته بصيغة يزوّده بها المكتب، ثم يرسل الأصل الورقي إلى اليمن، فيباشر المكتب الإجراءات نيابة عنه ويتابع هو سير القضية عبر بوابة الموكلين.',
  },
  {
    q: 'هل تتعاملون مع الشركات أم الأفراد فقط؟',
    a: 'يقدّم المكتب خدماته للأفراد والشركات معاً، ويشمل ذلك تأسيس الشركات وصياغة عقودها والترافع في منازعاتها التجارية.',
  },
  {
    q: 'كيف أتواصل مع المكتب؟',
    a: 'عبر واتساب أو الهاتف على الرقم +967771774502، أو بالبريد الإلكتروني alkathirilawfirm@gmail.com، أو بزيارة المكتب في شارع المحافظة بمدينة إب خلال ساعات العمل.',
  },
]

export default function FaqPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Breadcrumbs items={[{ name: 'الرئيسية', path: '/' }, { name: 'أسئلة شائعة', path: '/faq' }]} />
      <FaqSchema items={FAQ} />

      <header className="bg-slate-900 border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="شعار مكتب وليد الكثيري للمحاماة" width={40} height={40} className="rounded-full bg-white p-1 flex-shrink-0" />
            <div>
              <span className="font-display text-white font-bold text-sm sm:text-lg leading-tight block">مكتب وليد الكثيري</span>
              <span className="text-amber-200/80 text-[10px] sm:text-[11px]">للمحاماة والاستشارات القانونية</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-bold">
            <Link href="/" className="hover:text-white transition">الرئيسية</Link>
            <Link href="/about" className="hover:text-white transition">عن المكتب</Link>
            <Link href="/expats" className="hover:text-white transition">خدمة المغتربين</Link>
            <Link href="/articles" className="hover:text-white transition">المكتبة القانونية</Link>
          </nav>

          <div className="flex items-center gap-2">
            <MobileNav />
            <Link href="/client/login" className="inline-flex items-center bg-blue-600 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-2 rounded-full hover:bg-blue-700 transition whitespace-nowrap">
              بوابة الموكلين
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="royal-title text-3xl sm:text-4xl">أسئلة شائعة</h1>
          <p className="text-slate-300 text-sm leading-loose mt-5 max-w-2xl">
            إجابات عن أكثر ما يسأل عنه الموكلون. وإن لم تجد سؤالك هنا، تواصل مع المكتب مباشرة.
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="space-y-4">
          {FAQ.map((f, i) => (
            <div key={f.q} className="bg-slate-50 rounded-2xl px-6 py-5 border border-slate-100">
              <h2 className="font-display font-bold text-slate-900 text-[15px] mb-2.5 flex items-start gap-3">
                <span className="text-amber-600 text-sm mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                {f.q}
              </h2>
              <p className="text-slate-600 text-sm leading-loose pr-8">{f.a}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 bg-slate-900 rounded-2xl px-7 py-9 text-center">
          <h2 className="font-display text-xl font-bold text-white">لم تجد إجابة سؤالك؟</h2>
          <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            تواصل مع المكتب مباشرة، وستُعامَل معلوماتك بسرية تامة.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 font-bold text-sm px-8 py-3 rounded-full hover:shadow-lg hover:shadow-amber-500/20 transition"
          >
            التواصل عبر واتساب
          </a>
          <p className="text-slate-500 text-[11px] mt-5">ساعات العمل: السبت – الخميس، 1 ظهراً – 10 مساءً</p>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Link href="/" className="text-amber-400 text-sm hover:text-amber-300 transition">
            العودة إلى الصفحة الرئيسية
          </Link>
          <p className="text-xs mt-5">
            © 2026 مكتب وليد الكثيري للمحاماة والاستشارات القانونية. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  )
}
