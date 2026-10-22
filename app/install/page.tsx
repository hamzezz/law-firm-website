import Link from 'next/link'
import Image from 'next/image'
import MobileNav from '../components/mobile-nav'

export const metadata = {
  title: 'تثبيت التطبيق — مكتب وليد الكثيري للمحاماة',
  description:
    'خطوات تثبيت تطبيق مكتب وليد الكثيري للمحاماة على هواتف أندرويد وآيفون، ولمن هو موجَّه، وما يطلبه من أذونات.',
  alternates: { canonical: 'https://kathirilaw.com/install' },
  openGraph: {
    title: 'تثبيت التطبيق — مكتب وليد الكثيري للمحاماة',
    description: 'خطوات التثبيت على أندرويد وآيفون.',
    url: 'https://kathirilaw.com/install',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const APK_PATH = '/download/kathiri-law.apk'

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-slate-900 text-sm font-bold leading-snug">{title}</p>
        {children && <div className="text-slate-600 text-[13px] leading-relaxed mt-1">{children}</div>}
      </div>
    </li>
  )
}

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-amber-500">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.png" alt="شعار مكتب وليد الكثيري للمحاماة" width={38} height={38} className="rounded-full shrink-0" />
            <span className="font-display font-bold text-white text-sm md:text-base truncate">
              مكتب وليد الكثيري للمحاماة
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <MobileNav />
            <a
              href="/portal.html"
              className="inline-flex items-center bg-blue-600 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-4 py-2 rounded-full hover:bg-blue-700 transition whitespace-nowrap"
            >
              بوابة الموكلين
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8">
          <h1 className="font-display font-bold text-slate-900 text-2xl md:text-3xl mb-3">تثبيت التطبيق</h1>
          <p className="text-slate-700 text-sm md:text-[15px] leading-loose">
            تطبيق المكتب هو نفس النظام الذي تستعمله في المتصفح، في أيقونة على شاشة هاتفك.
            يفتح مباشرة على بوابة الدخول، ويضيف إليها ميزتين لا تعملان في المتصفح: تصوير محاضر
            الجلسات، ووصول الإشعارات إلى الهاتف.
          </p>
          <p className="text-slate-500 text-[13px] leading-relaxed mt-3">
            وهو أداة عمل داخلية للمكتب: لا يدخلها إلا من سلّمه المكتب اسم مستخدم وكلمة مرور.
          </p>
        </div>

        {/* ═══ أندرويد ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8">
          <div className="flex items-center gap-2.5 mb-4">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="2" width="12" height="20" rx="2" />
              <path d="M11 18h2" />
            </svg>
            <h2 className="font-display font-bold text-slate-900 text-base md:text-lg">على هواتف أندرويد</h2>
          </div>

          <a
            href={APK_PATH}
            download
            className="flex items-center justify-center gap-2.5 w-full bg-slate-900 text-white font-bold text-sm py-3.5 rounded-xl hover:bg-slate-800 transition mb-5"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
            </svg>
            تحميل التطبيق
          </a>

          <ol className="space-y-4">
            <Step n={1} title="اضغط «تحميل التطبيق» أعلاه">
              سينزّل ملف باسم <span dir="ltr" className="font-mono text-[12px]">kathiri-law.apk</span>.
            </Step>
            <Step n={2} title="افتح الملف من إشعار التنزيل أو من مدير الملفات">
              وقد يسألك الهاتف أول مرة عن السماح بالتثبيت من هذا المصدر — اسمح له.
            </Step>
            <Step n={3} title="اضغط «تثبيت»، ثم «فتح»" />
            <Step n={4} title="سجّل دخولك، واسمح بالإشعارات حين يطلبها">
              بهذا تصلك تنبيهات الجلسات على الهاتف مباشرة.
            </Step>
          </ol>

          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-900 text-[13px] font-bold mb-1.5">رسالة التحذير التي قد تظهر</p>
            <p className="text-amber-800 text-[13px] leading-relaxed">
              قد يعرض هاتفك تنبيهاً عن «مصدر غير معروف» أو يطلب فحص الملف. وهذا تنبيه يعرضه
              أندرويد لكل تطبيق لا يأتي من متجر Play، ولا علاقة له بسلامة الملف نفسه. والملف
              هنا صادر عن المكتب ومنشور على موقعه.
            </p>
            <p className="text-amber-800 text-[13px] leading-relaxed mt-2">
              وإن كنت تفضّل الانتظار حتى يتوفّر التطبيق في متجر Play، فاستعمل النظام من المتصفح
              حتى ذلك الحين — فهو يعمل كاملاً عدا تصوير المحاضر.
            </p>
          </div>
        </div>

        {/* ═══ آيفون ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8">
          <div className="flex items-center gap-2.5 mb-4">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="2.5" />
              <path d="M11 5.5h2" />
            </svg>
            <h2 className="font-display font-bold text-slate-900 text-base md:text-lg">على الآيفون</h2>
          </div>

          <p className="text-slate-600 text-[13px] leading-relaxed mb-4">
            نظام آبل لا يسمح بتثبيت التطبيقات خارج متجره، لكن يمكنك إضافة النظام إلى شاشتك
            الرئيسية فيعمل كتطبيق: أيقونة خاصة، وفتح بلا شريط المتصفح، ووصول الإشعارات.
          </p>

          <ol className="space-y-4">
            <Step n={1} title="افتح kathirilaw.com في متصفّح Safari">
              ولا بدّ أن يكون Safari تحديداً — لا Chrome ولا غيره.
            </Step>
            <Step n={2} title="اضغط زرّ المشاركة في أسفل الشاشة">
              وهو المربّع الذي يخرج منه سهم إلى أعلى.
            </Step>
            <Step n={3} title="اختر «إضافة إلى الشاشة الرئيسية»">
              ثم «إضافة».
            </Step>
            <Step n={4} title="افتح الأيقونة الجديدة، وسجّل دخولك">
              ثم اضغط زرّ تفعيل الإشعارات داخل لوحتك.
            </Step>
          </ol>

          <p className="text-slate-500 text-[12px] leading-relaxed mt-4">
            وتصوير محاضر الجلسات لا يعمل على الآيفون حالياً — وهو متاح في تطبيق أندرويد وحده.
          </p>
        </div>

        {/* ═══ الأذونات ═══ */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-8">
          <h2 className="font-display font-bold text-slate-900 text-base mb-3">ما يطلبه التطبيق من أذونات</h2>
          <ul className="space-y-2.5 text-slate-700 text-[13px] leading-relaxed">
            <li className="flex gap-2">
              <span className="text-amber-500 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span><strong>الكاميرا</strong> — لتصوير محاضر الجلسات، ولا تُفتح إلا حين تضغط زرّ التصوير بنفسك.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span><strong>الإشعارات</strong> — لتنبيهات الجلسات والمواعيد.</span>
            </li>
          </ul>
          <p className="text-slate-500 text-[12px] leading-relaxed mt-3">
            ولا يطلب موقعك الجغرافي ولا جهات اتصالك ولا صورك. وتفصيل ذلك في{' '}
            <Link href="/privacy" className="text-amber-700 hover:underline">سياسة الخصوصية</Link>.
          </p>
        </div>

        <p className="text-center">
          <Link href="/" className="text-slate-500 text-xs hover:text-amber-600 transition">
            العودة إلى الصفحة الرئيسية
          </Link>
        </p>
      </main>
    </div>
  )
}
