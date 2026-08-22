import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, title, excerpt, published_at, cover_image')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  const whatsappNumber = '967771774502'
  const whatsappMessage = encodeURIComponent('السلام عليكم، أرغب بطلب استشارة قانونية مبدئية من مكتب وليد الكثيري.')
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  const specialties = [
    { icon: '⚖️', title: 'القضاء الجنائي', desc: 'حضور التحقيقات أمام النيابة العامة، وتمثيل المتهمين والمجني عليهم في القضايا الجسيمة وغير الجسيمة، وتقديم الطعون.' },
    { icon: '🏢', title: 'الشركات والنزاعات التجارية', desc: 'صياغة الأنظمة الأساسية للشركات، والترافع أمام المحاكم التجارية في دعاوى الإفلاس وتحصيل الديون والشيكات.' },
    { icon: '📜', title: 'الأحوال الشخصية والمواريث', desc: 'التعامل الدقيق مع قضايا التركات، الفرز والقسمة، إثبات الوصايا والأوقاف، ونزاعات الأسرة.' },
    { icon: '⚖️', title: 'القضاء المدني', desc: 'الترافع في المنازعات المدنية وفق القانون المدني اليمني، بما يشمل دعاوى العقود والالتزامات، إثبات الملكية والحيازة، والتعويض عن الأضرار.' },
    { icon: '🏛️', title: 'القضاء الإداري', desc: 'الطعن في القرارات الإدارية أمام محكمة القضاء الإداري، ومنازعات الوظيفة العامة، ومراجعة العقود الإدارية وفق أحكام القانون الإداري اليمني.' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-white">
      <header className="bg-slate-900 border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="شعار المكتب" width={40} height={40} className="rounded-full bg-white p-1 flex-shrink-0" />
            <div>
              <h1 className="font-display text-white font-bold text-sm sm:text-lg leading-tight">مكتب وليد الكثيري</h1>
              <p className="text-amber-200/80 text-[10px] sm:text-[11px]">للمحاماة والاستشارات القانونية</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-bold">
            <a href="#home" className="hover:text-white transition">الرئيسية</a>
            <a href="#specialties" className="hover:text-white transition">التخصصات</a>
            <a href="#media" className="hover:text-white transition">المركز الإعلامي</a>
            <a href="#contact" className="hover:text-white transition">تواصل معنا</a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/staff/login" className="inline-flex items-center text-slate-200 text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-2 rounded-full border border-slate-600 hover:border-amber-400 hover:text-amber-300 transition whitespace-nowrap">فريق العمل</Link>
            <Link href="/client/login" className="inline-flex items-center bg-blue-600 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-2 rounded-full hover:bg-blue-700 transition whitespace-nowrap">بوابة الموكلين</Link>
          </div>
        </div>
      </header>

      <section id="home" className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_0%,_#fbbf24,_transparent_60%)]"></div>
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="royal-title text-4xl sm:text-5xl mb-3">مكتب وليد الكثيري</h2>
          <div className="w-24 h-0.5 bg-gradient-to-l from-transparent via-amber-400 to-transparent mx-auto mb-4"></div>
          <p className="text-amber-200/90 text-sm font-bold mb-8">للمحاماة والاستشارات القانونية والتحكيم</p>

          <h3 className="font-display text-white text-2xl sm:text-3xl font-bold leading-relaxed mb-6">
            نجمع بين{' '}
            <span className="bg-gradient-to-l from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">الخبرة العميقة</span>{' '}
            والدقة القانونية
          </h3>

          <p className="text-slate-300 text-base leading-loose max-w-2xl mx-auto mb-10">
            صرح قانوني متكامل يهدف لإرساء العدالة وحماية حقوقك ومصالحك أمام كافة درجات المحاكم، بمهنية وشفافية
            وسرية تامة، مع متابعة رقمية كاملة لقضيتك عبر بوابة الموكلين.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 font-bold px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-amber-500/20 transition">طلب استشارة قانونية عبر واتساب</a>
            <Link href="/client/login" className="w-full sm:w-auto text-white font-bold px-8 py-3.5 rounded-full border border-slate-600 hover:border-amber-400 hover:text-amber-300 transition">دخول بوابة الموكلين</Link>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-slate-900">+15</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">عاماً من الخبرة</p>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-slate-900">96%</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">نسبة كسب القضايا</p>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-slate-900">+450</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">موكل يثق بنا</p>
          </div>
          <div>
            <p className="font-display text-3xl sm:text-4xl font-bold text-slate-900">24/7</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">متابعة ميدانية</p>
          </div>
        </div>
      </section>

      <section id="specialties" className="bg-slate-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">مجالات التخصص الدقيق</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialties.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7 hover:shadow-md hover:border-amber-200 transition">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="media" className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between mb-12 flex-wrap gap-4">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">المركز الإعلامي والثقافة القانونية</h2>
            <Link href="/articles" className="text-amber-600 font-bold text-sm hover:text-amber-700 transition">عرض كافة المقالات ←</Link>
          </div>

          {(!articles || articles.length === 0) ? (
            <p className="text-slate-400 text-sm text-center py-10">لا توجد مقالات منشورة حالياً.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6">
              {articles.map((a) => (
                <Link key={a.slug} href={`/articles/${a.slug}`} className="block bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-amber-200 transition">
                  {a.cover_image && (
                    <img src={a.cover_image} alt={a.title} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-6">
                  <h3 className="font-display font-bold text-slate-900 mb-2 leading-snug">{a.title}</h3>
                  {a.excerpt && <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{a.excerpt}</p>}
                  <p className="text-amber-600 text-xs font-bold mt-4">اقرأ المزيد ←</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="contact" className="bg-slate-900 py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">اطلب استشارة قانونية مبدئية</h2>
          <p className="text-slate-400 text-sm mb-8">سرية معلوماتك مضمونة. تواصل معنا مباشرة عبر واتساب وسيتم الرد عليك في أقرب وقت.</p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gradient-to-l from-amber-500 to-amber-400 text-slate-900 font-bold px-10 py-4 rounded-full hover:shadow-lg hover:shadow-amber-500/20 transition text-base">تواصل عبر واتساب الآن</a>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 gap-10 mb-10">
            <div>
              <h3 className="font-display text-white font-bold text-lg mb-2">مكتب وليد الكثيري</h3>
              <p className="text-sm leading-relaxed mb-4">صرح قانوني متكامل يهدف لإرساء العدالة وحماية حقوقك بالطرق الشرعية والقانونية.</p>
              <Link href="/staff/login" className="text-amber-400 text-xs hover:text-amber-300 transition">تسجيل دخول فريق العمل</Link>
            </div>
            <div>
              <h3 className="font-display text-white font-bold text-lg mb-3">تواصل معنا</h3>
              <ul className="text-sm space-y-2">
                <li>الجمهورية اليمنية، محافظة إب، شارع المحافظة</li>
                <li>هاتف: +967 771 774 502</li>
                <li>alkathirilawfirm@gmail.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2026 مكتب وليد الكثيري للمحاماة والاستشارات القانونية. جميع الحقوق محفوظة.</p>
            <a href="https://devosos.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-300 transition">تمت الهندسة والتطوير بواسطة DevOsos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
