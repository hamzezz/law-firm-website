import Link from 'next/link'
import Image from 'next/image'
import { Breadcrumbs } from '../components/page-schema'
import MobileNav from '../components/mobile-nav'

export const metadata = {
  title: 'عن المكتب — مكتب وليد الكثيري للمحاماة',
  description:
    'نبذة عن مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، وقيمه المهنية، والتعريف بالمحامي وليد الكثيري.',
  alternates: { canonical: 'https://kathirilaw.com/about' },
}

const VALUES = [
  { title: 'السرية', desc: 'تُصان معلومات الموكلين وشؤونهم التزاماً مهنياً وقانونياً.' },
  { title: 'الدقة', desc: 'يُبنى كل رأي وإجراء على دراسة متأنية للوقائع والنصوص.' },
  { title: 'الوضوح', desc: 'يُطلَع الموكل على مراحل قضيته وما يصدر فيها أولاً بأول.' },
  { title: 'الالتزام', desc: 'يلتزم المكتب بأحكام القانون وآداب مهنة المحاماة وتقاليدها.' },
]

export default function AboutPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Breadcrumbs items={[{ name: 'الرئيسية', path: '/' }, { name: 'عن المكتب', path: '/about' }]} />
      <header className="bg-slate-900 border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="شعار المكتب" width={40} height={40} className="rounded-full bg-white p-1 flex-shrink-0" />
            <div>
              <h1 className="font-display text-white font-bold text-sm sm:text-lg leading-tight">مكتب وليد الكثيري</h1>
              <p className="text-amber-200/80 text-[10px] sm:text-[11px]">للمحاماة والاستشارات القانونية</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-bold">
            <Link href="/" className="hover:text-white transition">الرئيسية</Link>
            <span className="text-amber-300">عن المكتب</span>
            <Link href="/#specialties" className="hover:text-white transition">التخصصات</Link>
            <Link href="/#media" className="hover:text-white transition">المكتبة القانونية</Link>
            <Link href="/#contact" className="hover:text-white transition">تواصل معنا</Link>
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
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="royal-title text-3xl sm:text-4xl">عن المكتب</h1>
          <div className="w-20 h-0.5 bg-gradient-to-l from-transparent via-amber-400 to-transparent mx-auto mt-5"></div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-slate-600 text-base leading-loose">
          تأسس مكتب وليد الكثيري للمحاماة والاستشارات القانونية في محافظة إب، ليقدّم خدمات قانونية
          متكاملة للأفراد والشركات عبر أقسام متخصصة تعمل تحت إدارة واحدة. يقوم عمل المكتب على مبدأ
          أن كل قضية تستحق دراسة مستقلة وعناية كاملة، وأن ثقة الموكل تُبنى على الوضوح في الرأي،
          والأمانة في الإجراء، والكتمان في كل ما يُؤتمن عليه المكتب.
        </p>

        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            قيمنا المهنية
          </h2>

          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <h3 className="font-display font-bold text-lg text-slate-900 mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-8 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            المحامي وليد الكثيري
          </h2>

          <div className="grid sm:grid-cols-[200px_1fr] gap-8 items-start">
            <div className="aspect-[3/4] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <span className="text-slate-300 text-xs text-center px-4">مكان الصورة الرسمية</span>
            </div>

            <div>
              <p className="text-slate-600 text-sm leading-loose">
                محامٍ حاصل على بكالوريوس في الشريعة والقانون، ومقيّد في نقابة المحامين اليمنيين
                بدرجة مترافع أمام المحكمة العليا. يمارس المهنة منذ ستة عشر عاماً، وقد ترافع خلالها
                في مختلف درجات التقاضي، من محاكم الدرجة الأولى إلى الاستئناف والمحكمة العليا.
              </p>
              <p className="text-slate-600 text-sm leading-loose mt-4">
                تتركز خبرته في القضايا الجنائية والمدنية والتجارية، وقضايا الأحوال الشخصية
                والمواريث، إلى جانب الاستشارات القانونية للشركات والتحكيم.
              </p>
              <p className="text-slate-600 text-sm leading-loose mt-4">
                يشرف على عمل فريق المكتب ويتابع سير قضاياه، ويحرص على أن تُدار كل قضية وفق
                المعايير المهنية ذاتها التي قام عليها المكتب منذ تأسيسه.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Link href="/" className="text-amber-400 text-sm hover:text-amber-300 transition">
            العودة إلى الصفحة الرئيسية
          </Link>
          <p className="text-xs mt-5">© 2026 مكتب وليد الكثيري للمحاماة والاستشارات القانونية. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  )
}
