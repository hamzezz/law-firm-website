import Image from 'next/image'
import LogoutButton from '@/app/client/dashboard/logout-button'

export const metadata = {
  title: 'حساب موقوف — مكتب وليد الكثيري للمحاماة',
  robots: { index: false, follow: false },
}

const EMAIL = 'alkathirilawfirm@gmail.com'
const PHONE = '+967771774502'

/**
 * شاشة الحساب الموقوف.
 *
 * لا تُلام فيها الزيارة ولا يُقال «غير مصرّح»، فالإيقاف إجراءٌ إداريّ
 * لا اتّهام. وتُذكر فيها الحقيقة التي تهمّ صاحب الحساب أكثر من سبب
 * الإيقاف: أن ملفّ قضيّته باقٍ كما هو.
 */
export default function SuspendedPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center px-5 py-14">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-7 md:p-9 text-center">
        <Image
          src="/logo.png"
          alt="شعار مكتب وليد الكثيري للمحاماة"
          width={54}
          height={54}
          className="rounded-full bg-slate-50 p-1 mx-auto"
        />

        <h1 className="font-display font-bold text-slate-900 text-xl mt-5">هذا الحساب موقوف</h1>

        <p className="text-slate-600 text-sm leading-loose mt-4">
          أُوقف الدخول بهذا الحساب. وملفّ قضيّتك ومستنداتها وقرارات جلساتها
          <strong className="text-slate-800"> باقيةٌ كما هي</strong>، لم يُحذف منها شيء.
        </p>

        <p className="text-slate-600 text-sm leading-loose mt-3">
          لمعرفة السبب أو لإعادة تفعيل الدخول، تواصل مع إدارة المكتب.
        </p>

        <div className="mt-6 pt-5 border-t border-slate-100 text-sm space-y-1.5">
          <p>
            <a href={'tel:' + PHONE} dir="ltr" className="text-amber-700 font-bold hover:text-amber-900 hover:underline">
              {PHONE}
            </a>
          </p>
          <p>
            <a href={'mailto:' + EMAIL} dir="ltr" className="text-amber-700 hover:text-amber-900 hover:underline text-[13px]">
              {EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-7">
          <LogoutButton className="inline-block w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition" />
        </div>
      </div>
    </div>
  )
}
