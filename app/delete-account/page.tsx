import Link from 'next/link'
import Image from 'next/image'
import MobileNav from '../components/mobile-nav'

export const metadata = {
  title: 'حذف الحساب — مكتب وليد الكثيري للمحاماة',
  description:
    'كيف تطلب حذف حسابك في نظام وتطبيق مكتب وليد الكثيري للمحاماة: ما يُحذف، وما يبقى، ولماذا، وكيف تُرسل الطلب.',
  alternates: { canonical: 'https://kathirilaw.com/delete-account' },
  openGraph: {
    title: 'حذف الحساب — مكتب وليد الكثيري للمحاماة',
    description: 'كيف تطلب حذف حسابك، وما يُحذف وما يبقى ولماذا.',
    url: 'https://kathirilaw.com/delete-account',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const UPDATED = '3 نوفمبر 2026'
const EMAIL = 'alkathirilawfirm@gmail.com'
const PHONE = '+967771774502'
const APP_NAME = 'مكتب وليد الكثيري للمحاماة'

const MAIL_SUBJECT = 'طلب حذف حساب'
const MAIL_BODY =
  'أطلب حذف حسابي في نظام مكتب وليد الكثيري للمحاماة.\n\n' +
  'الاسم الكامل:\n' +
  'اسم المستخدم:\n' +
  'رقم الهاتف:\n'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="font-display font-bold text-slate-900 text-lg md:text-xl mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
        {title}
      </h2>
      <div className="text-slate-700 text-sm md:text-[15px] leading-loose space-y-3">{children}</div>
    </section>
  )
}

/**
 * صفحة طلب حذف الحساب.
 *
 * تشترطها Google Play لكلّ تطبيق له حسابات: رابطٌ عامّ يصله من حذف
 * التطبيق من جهازه، ولا يُطلب منه إعادة تثبيته ليطلب الحذف. ولذلك هي
 * صفحة عامة بلا تسجيل دخول.
 *
 * وتذكر ثلاثة أشياء تشترطها Google صراحةً: اسم التطبيق كما في المتجر،
 * وطريق الطلب بارزاً في أعلى الصفحة، وما يُحذف وما يُحفظ ولماذا.
 */
export default function DeleteAccountPage() {
  const mailHref =
    'mailto:' + EMAIL + '?subject=' + encodeURIComponent(MAIL_SUBJECT) + '&body=' + encodeURIComponent(MAIL_BODY)

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-slate-900 border-b-4 border-amber-500">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
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

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-10">
          <h1 className="font-display font-bold text-slate-900 text-2xl md:text-3xl mb-2">حذف الحساب</h1>
          <p className="text-slate-400 text-xs mb-8">آخر تحديث: {UPDATED}</p>

          <p className="text-slate-700 text-sm md:text-[15px] leading-loose mb-7">
            تبيّن هذه الصفحة كيف تطلب حذف حسابك في نظام <strong>{APP_NAME}</strong> وتطبيقه على
            الهواتف، وما الذي يُحذف وما الذي يبقى ولماذا. ولا تحتاج إلى تثبيت التطبيق ولا إلى
            تسجيل الدخول لتُرسل الطلب.
          </p>

          {/* طريق الطلب — بارزٌ في أعلى الصفحة كما تشترط Google */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 mb-9">
            <h2 className="font-display font-bold text-slate-900 text-base md:text-lg mb-2">كيف تُرسل الطلب</h2>
            <p className="text-slate-700 text-sm leading-loose mb-4">
              أرسل طلبك بأيّ من الوسيلتين، واذكر فيه <strong>اسمك الكامل واسم المستخدم ورقم هاتفك</strong>
              {' '}ليتأكّد المكتب أن الطلب منك أنت.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={mailHref}
                className="flex-1 text-center bg-amber-600 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-amber-700 transition"
              >
                إرسال الطلب بالبريد
              </a>
              <a
                href={'tel:' + PHONE}
                className="flex-1 text-center bg-white border border-amber-300 text-amber-800 font-bold text-sm px-5 py-3 rounded-xl hover:bg-amber-100 transition"
              >
                الاتصال بالمكتب
              </a>
            </div>

            <p className="text-slate-500 text-[12px] leading-loose mt-4">
              البريد:{' '}
              <a href={'mailto:' + EMAIL} dir="ltr" className="text-amber-800 hover:underline">{EMAIL}</a>
              {' '}— الهاتف:{' '}
              <a href={'tel:' + PHONE} dir="ltr" className="text-amber-800 hover:underline">{PHONE}</a>
            </p>
            <p className="text-slate-500 text-[12px] leading-loose mt-1">
              ويُرَدّ على الطلب خلال ثلاثين يوماً على الأكثر.
            </p>
          </div>

          <Section title="لا تُنشأ الحسابات هنا ذاتياً">
            <p>
              لا يُنشئ أحد حساباً بنفسه في هذا النظام. تُصدر إدارة المكتب الحسابات وتسلّمها
              لأصحابها: محامي المكتب وإدارته، والموكّلين الذين وكّلوا المكتب في قضاياهم. ولذلك
              يمرّ طلب الحذف بالإدارة.
            </p>
          </Section>

          <Section title="ما الذي يُحذف">
            <p>عند قبول الطلب يُحذف نهائياً:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li>حساب الدخول: اسم المستخدم وكلمة المرور.</li>
              <li>الاسم ورقم الهوية ورقم الهاتف المسجّلة في الحساب.</li>
              <li>اشتراك الإشعارات ومعرّف الجهاز.</li>
              <li>الإشعارات المرسَلة إليك.</li>
            </ul>
          </Section>

          <Section title="ما الذي يبقى، ولماذا">
            <p>
              إن كان لك ملفّ قضية لدى المكتب فإن <strong>ملفّ القضية لا يُتلف</strong>: رقمها
              وتواريخها وجلساتها وقراراتها ومحاضرها. ويُوقَف دخولك إلى النظام، ولا يُمحى
              السجلّ.
            </p>
            <p>
              وسبب ذلك أن ملفّ القضية سجلٌّ مهنيّ يلزم المحامي حفظه بموجب واجبه تجاه موكّليه
              وأنظمة نقابة المحامين اليمنيين، ولاحتمال الطعن أو الاستئناف أو الرجوع إليه. وهو
              من الاستثناءات التي تُجيزها سياسات Google للقطاعات الخاضعة لتنظيمٍ مهنيّ.
            </p>
            <p>
              <strong>مدّة الحفظ:</strong> يُحفظ ملفّ القضية ما دام المكتب ملزماً بحفظه مهنياً
              وقانونياً، ولا يُتلف بمجرّد حذف حساب الدخول.
            </p>
            <p>
              ويبقى كذلك <strong>سجلّ العمليات</strong> (ما جرى في النظام ومتى)، حفظاً لسلامة
              السجلّ ومنعاً للتلاعب به.
            </p>
            <p>
              وإن لم تكن لك قضية لدى المكتب فلا شيء يبقى: يُحذف الحساب وبياناته كلّها.
            </p>
          </Section>

          <Section title="إيقاف الدخول بدل الحذف">
            <p>
              إن كان ما تريده ألّا يدخل أحد بحسابك، فلا حاجة إلى الحذف: اطلب من المكتب
              <strong> إيقاف الدخول</strong>، فيُمنع الدخول بالحساب فوراً ويبقى ملفّك كما هو،
              ويمكن إعادة تفعيله متى شئت.
            </p>
          </Section>

          <Section title="من داخل التطبيق">
            <p>
              يمكنك أيضاً أن تطلب الحذف من داخل التطبيق بمراسلة المكتب على الوسيلتين أعلاه.
              وهما الوسيلتان نفسهما، فلا يختلف الطلب باختلاف الطريق.
            </p>
          </Section>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h2 className="font-display font-bold text-slate-900 text-base mb-3">للتواصل</h2>
            <p className="text-slate-700 text-sm leading-loose">
              مكتب وليد الكثيري للمحاماة والاستشارات القانونية
              <br />
              إب — شارع المحافظة، جوار صالة حدة
              <br />
              البريد الإلكتروني:{' '}
              <a href={'mailto:' + EMAIL} dir="ltr" className="text-amber-700 hover:text-amber-900 hover:underline">
                {EMAIL}
              </a>
              <br />
              الهاتف:{' '}
              <a href={'tel:' + PHONE} dir="ltr" className="text-amber-700 hover:text-amber-900 hover:underline">
                {PHONE}
              </a>
            </p>
          </div>

          <p className="text-slate-500 text-xs mt-6">
            وتفصيل ما يُجمع وأين يُخزَّن في{' '}
            <Link href="/privacy" className="text-amber-700 hover:underline font-bold">
              سياسة الخصوصية
            </Link>
            .
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-slate-500 text-xs hover:text-amber-600 transition">
            العودة إلى الصفحة الرئيسية
          </Link>
        </p>
      </main>
    </div>
  )
}
