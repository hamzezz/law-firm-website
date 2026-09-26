import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumbs, FaqSchema } from '../components/page-schema'
import MobileNav from '../components/mobile-nav'

const WHATSAPP =
  'https://wa.me/967771774502?text=' +
  encodeURIComponent('السلام عليكم، أنا مغترب وأرغب في متابعة قضية داخل اليمن عبر وكالة شرعية.')

export const metadata = {
  title: 'متابعة قضايا المغتربين اليمنيين داخل اليمن — مكتب وليد الكثيري',
  description:
    'خدمة توكيل ومتابعة قضايا اليمنيين المقيمين في السعودية وأمريكا داخل اليمن: صيغة التوكيل، وتصديقه في السفارة، ومتابعة القضية عبر بوابة الموكلين.',
  alternates: { canonical: 'https://kathirilaw.com/expats' },
  openGraph: {
    title: 'متابعة قضايا المغتربين اليمنيين داخل اليمن',
    description:
      'توكيل شرعي من السفارة اليمنية، ومتابعة القضية داخل اليمن عن بُعد عبر بوابة الموكلين.',
    url: 'https://kathirilaw.com/expats',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const STEPS = [
  {
    t: 'تواصل معنا وحدّد موضوع القضية',
    d: 'نستمع إلى موضوع قضيتك، ونحدد نوع التوكيل المطلوب ونطاق الصلاحيات التي يحتاجها.',
  },
  {
    t: 'نرسل لك صيغة التوكيل جاهزة',
    d: 'يزوّدك المكتب بصيغة مكتوبة تحمل بياناتك وبيانات الوكيل ونطاق التوكيل، فتحملها معك إلى السفارة.',
  },
  {
    t: 'التصديق في السفارة أو القنصلية',
    d: 'تحضر شخصياً إلى أقرب سفارة أو قنصلية يمنية مع شاهدين ووثيقة هوية سارية. تصادق السفارة على صحة توقيعك وبصمتك وحضور الشاهدين.',
  },
  {
    t: 'أرسل صورة التوكيل عبر واتساب',
    d: 'نراجع الصورة ونتأكد من اكتمال بياناتها وصلاحيتها للغرض المطلوب قبل أن ترسل الأصل.',
  },
  {
    t: 'إرسال الأصل الورقي إلى اليمن',
    d: 'يلزم وصول الأصل الورقي، إذ لا يُكتفى بالصورة في استكمال الإجراءات الرسمية.',
  },
  {
    t: 'تعميد التوكيل من وزارة الخارجية',
    d: 'يتولى الموكل تعميد التوكيل من وزارة الخارجية اليمنية، ويرشده المكتب إلى الجهة والإجراء المطلوب.',
  },
  {
    t: 'مباشرة القضية ومتابعتها',
    d: 'يباشر المكتب الإجراءات نيابة عنك، وتتابع سير القضية أولاً بأول عبر بوابة الموكلين.',
  },
]

const FAQ = [
  {
    q: 'هل أستطيع متابعة قضيتي في اليمن وأنا خارجه؟',
    a: 'نعم. يكفي أن توكّل المكتب بتوكيل شرعي مصدَّق من السفارة اليمنية في بلد إقامتك، فيباشر الإجراءات نيابة عنك، وتتابع سير القضية عبر بوابة الموكلين الإلكترونية.',
  },
  {
    q: 'من أين أصدر التوكيل الشرعي؟',
    a: 'من أقرب سفارة أو قنصلية يمنية في بلد إقامتك. تصادق السفارة على صحة توقيعك وبصمة إبهامك وحضور شاهدين، ويشترط حضورك شخصياً مع وثيقة هوية سارية.',
  },
  {
    q: 'هل تكفي صورة التوكيل عبر واتساب؟',
    a: 'الصورة تكفي لمراجعة التوكيل والتأكد من اكتماله والبدء في التحضير، لكن استكمال الإجراءات الرسمية يستلزم وصول الأصل الورقي إلى اليمن.',
  },
  {
    q: 'هل تزوّدونني بصيغة التوكيل؟',
    a: 'نعم. يرسل لك المكتب صيغة مكتوبة تتضمن بياناتك ونطاق الصلاحيات، فتحملها معك إلى السفارة بدل صياغتها هناك.',
  },
  {
    q: 'كيف أعرف ما يجري في قضيتي؟',
    a: 'لكل موكل حساب في بوابة الموكلين يعرض قضاياه ومواعيد جلساتها القادمة وقرارات الجلسات السابقة ومحاضرها، متاح من أي جهاز وفي أي وقت.',
  },
  {
    q: 'أقيم في الولايات المتحدة، هل الإجراء مختلف؟',
    a: 'اليمن ليس طرفاً في اتفاقية لاهاي، فلا يُعتمد ختم الأبوستيل. وقد تتطلب بعض الوثائق الصادرة في الولايات المتحدة توثيقاً محلياً قبل تصديق السفارة، وهو ما نرشدك إليه بحسب طبيعة قضيتك.',
  },
]

export default function ExpatsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Breadcrumbs items={[{ name: 'الرئيسية', path: '/' }, { name: 'خدمة المغتربين', path: '/expats' }]} />
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
            <Link href="/#specialties" className="hover:text-white transition">التخصصات</Link>
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

      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-amber-300/80 text-xs font-bold mb-3">خدمة المغتربين</p>
          <h1 className="royal-title text-3xl sm:text-4xl leading-snug">
            متابعة قضاياك داخل اليمن وأنت خارجه
          </h1>
          <p className="text-slate-300 text-sm leading-loose mt-6 max-w-2xl">
            يمكنك توكيل المكتب بتوكيل شرعي مصدَّق من السفارة اليمنية في بلد إقامتك، فيباشر
            إجراءات قضيتك نيابة عنك أمام المحاكم والجهات الرسمية، وتتابع سيرها عبر بوابة
            الموكلين دون الحاجة إلى السفر.
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            خطوات التوكيل
          </h2>
          <ol className="space-y-5">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.t}</p>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            ما تحتاجه في السفارة
          </h2>
          <ul className="space-y-2.5">
            {[
              'حضورك شخصياً إلى السفارة أو القنصلية',
              'وثيقة هوية سارية (جواز السفر أو البطاقة الشخصية)',
              'شاهدان مع وثائق هويتهما',
              'صيغة التوكيل التي يرسلها لك المكتب',
            ].map((d) => (
              <li key={d} className="text-sm text-slate-600 flex items-start gap-2.5">
                <span className="text-slate-300 mt-0.5">—</span>
                {d}
              </li>
            ))}
          </ul>
          <p className="text-slate-400 text-xs mt-4 leading-relaxed">
            قد تختلف المتطلبات والرسوم من سفارة إلى أخرى، فيُستحسن مراجعة موقع السفارة في بلد
            إقامتك قبل الحضور.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            متابعة القضية عن بُعد
          </h2>
          <p className="text-slate-600 text-sm leading-loose">
            بعد مباشرة القضية، يُنشأ لك حساب في بوابة الموكلين تتابع منه قضاياك في أي وقت:
            مواعيد الجلسات القادمة، وقرارات الجلسات السابقة، ومحاضرها المرفوعة. ولا تحتاج إلى
            تثبيت أي تطبيق، فالبوابة تعمل من متصفح هاتفك أو حاسوبك.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            أسئلة شائعة
          </h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="bg-slate-50 rounded-xl px-5 py-4">
                <p className="font-bold text-slate-900 text-sm mb-2">{f.q}</p>
                <p className="text-slate-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 bg-slate-900 rounded-2xl px-7 py-9 text-center">
          <h2 className="font-display text-xl font-bold text-white">ابدأ من هنا</h2>
          <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            تواصل مع المكتب لعرض قضيتك، ونرسل لك صيغة التوكيل المناسبة لها.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 font-bold text-sm px-8 py-3 rounded-full hover:shadow-lg hover:shadow-amber-500/20 transition"
          >
            التواصل عبر واتساب
          </a>
          <p className="text-slate-500 text-[11px] mt-5">
            ساعات العمل بتوقيت اليمن: السبت – الخميس، 1 ظهراً – 10 مساءً
          </p>
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
