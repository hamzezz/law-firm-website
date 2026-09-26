import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { SPECIALTIES, getSpecialty } from '@/lib/content/specialties'
import { Breadcrumbs } from '@/app/components/page-schema'
import MobileNav from '@/app/components/mobile-nav'

const BASE = 'https://kathirilaw.com'
const WHATSAPP =
  'https://wa.me/967771774502?text=' +
  encodeURIComponent('السلام عليكم، أرغب في التواصل مع مكتب وليد الكثيري للمحاماة بخصوص استفسار قانوني.')

export function generateStaticParams() {
  return SPECIALTIES.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = getSpecialty(slug)
  if (!sp) return { title: 'صفحة غير موجودة' }

  const url = `${BASE}/specialties/${sp.slug}`
  return {
    title: sp.metaTitle,
    description: sp.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: sp.metaTitle,
      description: sp.metaDescription,
      url,
      type: 'website',
      siteName: 'مكتب وليد الكثيري للمحاماة',
      locale: 'ar_YE',
    },
  }
}

export default async function SpecialtyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sp = getSpecialty(slug)
  if (!sp) notFound()

  const others = SPECIALTIES.filter((s) => s.slug !== sp.slug)

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <Breadcrumbs
        items={[
          { name: 'الرئيسية', path: '/' },
          { name: 'مجالات الممارسة', path: '/#specialties' },
          { name: sp.title, path: `/specialties/${sp.slug}` },
        ]}
      />

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

      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-14">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-amber-300/80 text-xs font-bold mb-3">مجالات الممارسة</p>
          <h1 className="royal-title text-3xl sm:text-4xl">{sp.title}</h1>
          <p className="text-slate-300 text-sm leading-loose mt-5 max-w-2xl">{sp.intro}</p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            ما يقدّمه المكتب
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {sp.services.map((s) => (
              <li key={s} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                <span className="text-amber-500 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            كيف تسير القضية
          </h2>
          <ol className="space-y-4">
            {sp.process.map((p, i) => (
              <li key={p.step} className="flex gap-4">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{p.step}</p>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            ما تحتاج إحضاره
          </h2>
          <ul className="space-y-2.5">
            {sp.documents.map((d) => (
              <li key={d} className="text-sm text-slate-600 flex items-start gap-2.5">
                <span className="text-slate-300 mt-0.5">—</span>
                {d}
              </li>
            ))}
          </ul>
          <p className="text-slate-400 text-xs mt-4 leading-relaxed">
            القائمة استرشادية، وقد تختلف المستندات المطلوبة باختلاف ظروف كل قضية.
          </p>
        </section>

        <section className="mt-14 bg-slate-900 rounded-2xl px-7 py-9 text-center">
          <h2 className="font-display text-xl font-bold text-white">لديك قضية في هذا المجال؟</h2>
          <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            تواصل مع المكتب لعرض قضيتك، وستُعامَل معلوماتك بسرية تامة.
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
            ساعات العمل: السبت – الخميس، 1 ظهراً – 10 مساءً
          </p>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-5">مجالات أخرى</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/specialties/${o.slug}`}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 hover:border-amber-200 hover:text-amber-700 transition"
              >
                {o.title}
              </Link>
            ))}
          </div>
        </section>
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
