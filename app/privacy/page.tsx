import Link from 'next/link'
import Image from 'next/image'
import MobileNav from '../components/mobile-nav'

export const metadata = {
  title: 'سياسة الخصوصية — مكتب وليد الكثيري للمحاماة',
  description:
    'سياسة الخصوصية لنظام إدارة القضايا وتطبيق مكتب وليد الكثيري للمحاماة: ما البيانات التي تُجمع، ولمن تُتاح، وأين تُخزَّن، وكيف تُحمى.',
  alternates: { canonical: 'https://kathirilaw.com/privacy' },
  openGraph: {
    title: 'سياسة الخصوصية — مكتب وليد الكثيري للمحاماة',
    description: 'ما البيانات التي يجمعها نظام المكتب وتطبيقه، ولمن تُتاح، وأين تُخزَّن، وكيف تُحمى.',
    url: 'https://kathirilaw.com/privacy',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const UPDATED = '15 أكتوبر 2026'
const EMAIL = 'alkathirilawfirm@gmail.com'
const PHONE = '+967771774502'

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

export default function PrivacyPage() {
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
          <h1 className="font-display font-bold text-slate-900 text-2xl md:text-3xl mb-2">سياسة الخصوصية</h1>
          <p className="text-slate-400 text-xs mb-8">آخر تحديث: {UPDATED}</p>

          <p className="text-slate-700 text-sm md:text-[15px] leading-loose mb-9">
            تبيّن هذه السياسة كيف يتعامل مكتب وليد الكثيري للمحاماة مع البيانات في نظام إدارة القضايا
            على <span dir="ltr">kathirilaw.com</span> وفي تطبيق المكتب على الهواتف. والنظام أداة عمل
            داخلية لمحامي المكتب وإدارته وموكّليه، وليس خدمة عامة يسجّل فيها الناس بأنفسهم.
          </p>

          <Section title="من يستعمل النظام">
            <p>
              لا يُنشئ أحد حساباً بنفسه. تُصدر إدارة المكتب الحسابات وتسلّمها لأصحابها، وهم ثلاثة:
              محامو المكتب وإدارته، والموكّلون الذين وكّلوا المكتب في قضاياهم.
            </p>
          </Section>

          <Section title="البيانات التي تُجمع">
            <p>لا يجمع النظام إلا ما يلزم لإدارة القضايا:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li><strong>بيانات الحساب:</strong> الاسم، واسم المستخدم، وكلمة المرور مخزّنة مشفّرة لا يطّلع عليها أحد.</li>
              <li><strong>بيانات الموكّل:</strong> الاسم ورقم الهوية.</li>
              <li><strong>بيانات القضية:</strong> رقمها وعنوانها ونوعها والمحكمة والطرف الآخر وتواريخها ونتيجتها.</li>
              <li><strong>الجلسات:</strong> مواعيدها وقراراتها والمواعيد القانونية الحرجة.</li>
              <li><strong>المستندات:</strong> محاضر الجلسات وما يرفقه المحامي بالقضية.</li>
              <li><strong>سجلّ العمليات:</strong> ما جرى في النظام ومتى ومن قام به، حفظاً لسلامة السجلّ.</li>
              <li><strong>اشتراك الإشعارات:</strong> معرّف تقني للجهاز، لمن فعّل الإشعارات الفورية.</li>
            </ul>
            <p className="pt-1">
              ولا يجمع النظام موقعك الجغرافي، ولا جهات اتصالك، ولا أي شيء من جهازك خارج ما ذُكر.
            </p>
          </Section>

          <Section title="الكاميرا في التطبيق">
            <p>
              يطلب التطبيق إذن الكاميرا لغرض واحد: تصوير محاضر الجلسات. ولا تُفتح الكاميرا إلا حين
              يضغط المحامي زرّ التصوير بنفسه، ولا يُلتقط شيء في الخلفية.
            </p>
            <p>
              وتُعالَج الصورة على الجهاز نفسه — كشف حواف الورقة وتصحيح الميلان — ثم تُرفع إلى ملف
              القضية. ولا تُستعمل الكاميرا لأي غرض آخر.
            </p>
          </Section>

          <Section title="من يرى ماذا">
            <ul className="list-disc pr-5 space-y-1.5">
              <li><strong>الموكّل</strong> يرى قضاياه هو وحدها: جلساتها وقراراتها ومستنداتها. ولا يرى قضايا غيره ولا بيانات أي موكّل آخر.</li>
              <li><strong>المحامي</strong> يرى القضايا المسندة إليه.</li>
              <li><strong>الإدارة</strong> ترى قضايا المكتب لإدارتها ومتابعتها.</li>
            </ul>
            <p className="pt-1">
              وهذا الفصل مفروض في قاعدة البيانات نفسها لا في الواجهة فحسب.
            </p>
          </Section>

          <Section title="سرّية مهنية قبل أن تكون تقنية">
            <p>
              بيانات القضايا مشمولة بسرّ المهنة الذي يلتزم به المحامي بموجب قانون المحاماة وأنظمة
              نقابة المحامين اليمنيين. ولا تُفشى لأي جهة إلا بأمر قضائي أو بموافقة الموكّل.
            </p>
            <p>
              ولا يبيع المكتب هذه البيانات ولا يشاركها لأغراض تسويقية ولا إعلانية، ولا توجد في النظام
              أي أدوات تتبّع أو تحليلات أو إعلانات.
            </p>
          </Section>

          <Section title="أين تُخزَّن البيانات">
            <p>يعتمد النظام على مزوّدي خدمة سحابية، كلٌّ لغرض محدّد:</p>
            <ul className="list-disc pr-5 space-y-1.5">
              <li><strong>Supabase</strong> — قاعدة البيانات ومستندات القضايا الجارية.</li>
              <li><strong>Render</strong> — استضافة الموقع والنظام.</li>
              <li><strong>Cloudflare R2</strong> — أرشيف مستندات القضايا بعد إغلاقها.</li>
              <li><strong>Google</strong> — محرّك مسح المستندات في تطبيق أندرويد، ويعمل على الجهاز.</li>
            </ul>
            <p className="pt-1">
              ولا يُتاح لهؤلاء الاطّلاع على البيانات لأغراضهم؛ هم مزوّدو بنية تحتية تُحفظ عليها
              البيانات مشفّرة أثناء النقل والتخزين.
            </p>
          </Section>

          <Section title="مدة الحفظ">
            <p>
              تُحفظ بيانات القضية ومستنداتها بعد إغلاقها، وفاءً بواجب المكتب في حفظ ملفات موكّليه
              ولاحتمال الطعن أو الاستئناف أو الرجوع إليها لاحقاً. وتُنقل مستندات القضية المغلقة إلى
              الأرشيف، ويبقى اطّلاع أصحاب الصلاحية عليها كما كان.
            </p>
          </Section>

          <Section title="حقوق الموكّل">
            <p>
              لك أن تطلب الاطّلاع على بياناتك لدينا، أو تصحيح ما كان منها خطأً، أو الاستفسار عن مدة
              حفظها. ويخضع حذف بيانات قضية لاعتبارات مهنية وقانونية، فملف القضية سجلٌّ لا يُتلف
              بالطلب وحده.
            </p>
            <p>تواصل معنا بأي من الوسيلتين أدناه.</p>
          </Section>

          <Section title="حسابات الأطفال">
            <p>
              النظام أداة عمل مهنية، ولا يُوجَّه إلى من هم دون الثامنة عشرة، ولا تُنشأ فيه حسابات
              لهم.
            </p>
          </Section>

          <Section title="تعديل هذه السياسة">
            <p>
              قد تُحدَّث هذه الصفحة كلما تغيّر شيء في النظام، ويُذكر تاريخ آخر تحديث في أعلاها.
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
