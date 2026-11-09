import Link from 'next/link'
import Image from 'next/image'
import MobileNav from '../components/mobile-nav'

export const metadata = {
  title: 'شروط الاستخدام — مكتب وليد الكثيري للمحاماة',
  description:
    'شروط استخدام نظام إدارة القضايا وتطبيق مكتب وليد الكثيري للمحاماة: لمن النظام، وما يُتاح فيه، وما لا يُعدّ استشارة قانونية.',
  alternates: { canonical: 'https://kathirilaw.com/terms' },
  openGraph: {
    title: 'شروط الاستخدام — مكتب وليد الكثيري للمحاماة',
    description: 'لمن هذا النظام، وما يُتاح فيه، وما مسؤولية كلّ طرف.',
    url: 'https://kathirilaw.com/terms',
    type: 'website',
    siteName: 'مكتب وليد الكثيري للمحاماة',
    locale: 'ar_YE',
  },
}

const UPDATED = '3 نوفمبر 2026'
const EMAIL = 'alkathirilawfirm@gmail.com'
const PHONE = '+967715113113'

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
 * شروط الاستخدام.
 *
 * تصف ما يجري فعلاً في النظام ولا تتعهّد بما يحتاج إقرار المكتب:
 * لا رسوماً، ولا مُدداً، ولا ضمانات نتائج. وما كان قراراً مهنيّاً
 * تُرك خارجها حتى يُقرّه الأستاذ وليد.
 *
 * وتلتزم أدب المهنة: لا «الأفضل» ولا «الأول»، ولا وعدَ بنتيجة.
 */
export default function TermsPage() {
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
          <h1 className="font-display font-bold text-slate-900 text-2xl md:text-3xl mb-2">شروط الاستخدام</h1>
          <p className="text-slate-400 text-xs mb-8">آخر تحديث: {UPDATED}</p>

          <p className="text-slate-700 text-sm md:text-[15px] leading-loose mb-9">
            تبيّن هذه الشروط إطار استعمال نظام إدارة القضايا على{' '}
            <span dir="ltr">kathirilaw.com</span> وتطبيق المكتب على الهواتف. واستعمالك للنظام
            يعني علمك بها.
          </p>

          <Section title="لمن هذا النظام">
            <p>
              النظام أداة عمل داخلية للمكتب، وليس خدمة عامة يسجّل فيها الناس بأنفسهم. ولا يُنشئ
              أحد حساباً بنفسه: تُصدر إدارة المكتب الحسابات وتسلّمها لأصحابها — محامي المكتب
              وإدارته، والموكّلين الذين وكّلوا المكتب في قضاياهم.
            </p>
            <p>
              وانتهاء الوكالة أو العلاقة بالمكتب يُنهي حقّ استعمال النظام.
            </p>
          </Section>

          <Section title="ما يُتاح في النظام">
            <p>
              يتيح النظام للموكّل الاطّلاع على قضاياه هو وحدها: مواعيد جلساتها وقراراتها
              ومستنداتها والمواعيد القانونية الحرجة فيها. ويتيح لمحامي المكتب وإدارته إدارة
              القضايا ومتابعتها.
            </p>
          </Section>

          <Section title="المحتوى ليس استشارة قانونية">
            <p>
              ما يُعرض في النظام من بيانات القضية وقراراتها ومواعيدها هو <strong>تسجيلٌ لما جرى
              وما هو مجدول</strong>، لا رأياً قانونياً ولا استشارة. والاستشارة تكون من المحامي
              المختصّ بقضيتك مباشرةً.
            </p>
            <p>
              وما يُنشر في الموقع من مقالات ومنشورات تعريفٌ عامّ بالأحكام، ولا يُغني عن استشارةٍ
              في واقعةٍ بعينها، ولا تنشأ به علاقة توكيل.
            </p>
          </Section>

          <Section title="التواريخ والمواعيد">
            <p>
              تُدخَل مواعيد الجلسات من كشوف المحاكم ومن إدخال المكتب، وقد يقع فيها سهو أو تتغيّر
              بقرار المحكمة. <strong>فالمعوَّل عليه ما تقرّره المحكمة</strong>، وما في النظام
              مساعدٌ على المتابعة لا بديلٌ عنها. وعند أيّ اختلاف راجع محاميك.
            </p>
          </Section>

          <Section title="مسؤوليتك عن حسابك">
            <p>
              اسم المستخدم وكلمة المرور لك وحدك، ولا تُسلَّم لغيرك. وما يجري في النظام بحسابك
              يُنسب إليك، وكلّ عملية تُسجَّل في سجلّ العمليات بوقتها.
            </p>
            <p>
              وإن ظننتَ أن أحداً اطّلع على كلمة مرورك فأبلغ المكتب فوراً لتُغيَّر أو يُوقَف
              الدخول بالحساب.
            </p>
          </Section>

          <Section title="ما لا يجوز">
            <ul className="list-disc pr-5 space-y-1.5">
              <li>محاولة الوصول إلى قضايا أو بيانات لا تخصّك.</li>
              <li>نشر مستندات القضية أو قراراتها أو بيانات أطرافها خارج النظام بغير حقّ.</li>
              <li>استعمال النظام لغرضٍ غير متابعة قضيتك أو عمل المكتب.</li>
              <li>محاولة تعطيل النظام أو اختباره أمنياً بلا إذن مكتوب.</li>
            </ul>
            <p className="pt-1">
              وللمكتب إيقاف الدخول بالحساب عند مخالفةٍ من هذه، ويبقى ملفّ القضية محفوظاً.
            </p>
          </Section>

          <Section title="توافر الخدمة">
            <p>
              يعتمد النظام على مزوّدي خدمة سحابية وعلى شبكة الإنترنت، وقد ينقطع لصيانة أو لعطلٍ
              خارج إرادة المكتب. ولا يُعدّ انقطاعه إخلالاً بالتزامات المكتب تجاه موكّليه، ولا
              يُسقط موعداً قضائياً ولا يُنشئ حقّاً في تأجيله.
            </p>
          </Section>

          <Section title="الخصوصية وحذف الحساب">
            <p>
              ما يُجمع من بيانات وأين يُخزَّن ومن يراه مبيّنٌ في{' '}
              <Link href="/privacy" className="text-amber-700 hover:text-amber-900 hover:underline font-bold">
                سياسة الخصوصية
              </Link>
              . وطريقة طلب حذف الحساب وما يُحذف وما يبقى في{' '}
              <Link href="/delete-account" className="text-amber-700 hover:text-amber-900 hover:underline font-bold">
                صفحة حذف الحساب
              </Link>
              .
            </p>
          </Section>

          <Section title="الأتعاب والعلاقة المهنية">
            <p>
              هذه الشروط تخصّ استعمال النظام وحده. أمّا الوكالة وأتعابها والتزامات كلٍّ من المكتب
              والموكّل فيحكمها عقد الوكالة بينكما وأنظمة نقابة المحامين اليمنيين، ولا تُعدّل هذه
              الصفحة شيئاً منها.
            </p>
          </Section>

          <Section title="القانون الواجب التطبيق">
            <p>
              تخضع هذه الشروط للقوانين النافذة في الجمهورية اليمنية، وتختصّ محاكمها بما ينشأ
              عنها.
            </p>
          </Section>

          <Section title="تعديل هذه الشروط">
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
